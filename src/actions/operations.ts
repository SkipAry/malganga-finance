"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { addDays, startOfDay } from "@/lib/dates";
import { dispatcher, OVERDUE_REPEAT_DAYS } from "@/lib/notify";
import { userDeletionBlocker } from "@/lib/user-deletion";
import { assertAdmin, assertStaff, recordAudit } from "@/lib/session";
import { expenseSchema, fieldErrors, userSchema } from "@/lib/validators";
import type { FormState } from "./auth";

function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

/* ------------------------------------------------------------------ expenses */

export async function saveExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await assertStaff();
  const id = formData.get("id") as string | null;

  const parsed = expenseSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { amount, ...rest } = parsed.data;
  if (id) {
    await db.expense.update({ where: { id }, data: { ...rest, amountPaise: amount } });
    await recordAudit(user.id, "UPDATE", "Expense", id);
  } else {
    const row = await db.expense.create({
      data: { ...rest, amountPaise: amount, recordedById: user.id },
    });
    await recordAudit(user.id, "CREATE", "Expense", row.id, { category: row.category });
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { message: id ? "Expense updated." : "Expense recorded." };
}

export async function removeExpense(formData: FormData): Promise<void> {
  const user = await assertAdmin();
  const id = String(formData.get("id"));
  await db.expense.delete({ where: { id } });
  await recordAudit(user.id, "DELETE", "Expense", id);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

/* --------------------------------------------------------------------- users */

export async function saveUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const id = formData.get("id") as string | null;

  const parsed = userSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { password, investorId, ...rest } = parsed.data;

  if (rest.role === "INVESTOR" && !investorId) {
    return { errors: { investorId: "Link this login to an investor record." } };
  }
  if (!id && !password) {
    return { errors: { password: "Set an initial password." } };
  }

  const clash = await db.user.findFirst({
    where: { email: rest.email, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) return { errors: { email: "That email is already in use." } };

  const data = {
    ...rest,
    investorId: rest.role === "INVESTOR" ? investorId : null,
    ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
  };

  if (id) {
    await db.user.update({ where: { id }, data });
    await recordAudit(admin.id, "UPDATE", "User", id, { role: rest.role });
  } else {
    const created = await db.user.create({ data: data as typeof data & { passwordHash: string } });
    await recordAudit(admin.id, "CREATE", "User", created.id, { role: rest.role });
  }

  revalidatePath("/users");
  return { message: id ? "User updated." : "User created." };
}

/**
 * Deletes a login that has never been used. Anything with history is refused
 * and must be disabled instead - see src/lib/user-deletion.ts for why.
 */
export async function deleteUser(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = String(formData.get("id"));

  const target = await db.user.findUnique({
    where: { id },
    select: { email: true, name: true, role: true, isActive: true },
  });
  if (!target) throw new Error("User not found");

  const [auditEntries, paymentsRecorded, expensesRecorded, activeAdmins] = await Promise.all([
    db.auditLog.count({ where: { userId: id } }),
    db.payment.count({ where: { recordedById: id } }),
    db.expense.count({ where: { recordedById: id } }),
    db.user.count({ where: { role: "ADMIN", isActive: true } }),
  ]);

  const blocker = userDeletionBlocker({
    isSelf: id === admin.id,
    isLastActiveAdmin: target.role === "ADMIN" && target.isActive && activeAdmins <= 1,
    auditEntries,
    paymentsRecorded,
    expensesRecorded,
  });
  if (blocker) throw new Error(blocker);

  await db.user.delete({ where: { id } });
  // Logged against the acting admin: the deleted row cannot hold its own record.
  await recordAudit(admin.id, "DELETE", "User", id, {
    email: target.email,
    name: target.name,
    role: target.role,
  });
  revalidatePath("/users");
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = String(formData.get("id"));

  if (id === admin.id) throw new Error("You cannot deactivate your own login");

  const target = await db.user.findUnique({ where: { id }, select: { isActive: true, role: true } });
  if (!target) throw new Error("User not found");

  // Never leave the system without a way back in.
  if (target.isActive && target.role === "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
    if (admins <= 1) throw new Error("At least one active administrator is required");
  }

  await db.user.update({ where: { id }, data: { isActive: !target.isActive } });
  await recordAudit(admin.id, target.isActive ? "DEACTIVATE" : "REACTIVATE", "User", id);
  revalidatePath("/users");
}

/* ------------------------------------------------------------- notifications */

/**
 * Sends everything due up to now through the configured dispatcher, and tops
 * up repeat overdue reminders for EMIs that are still unpaid.
 *
 * Not reachable from the UI while delivery is manual - the Reminders screen
 * calls refreshReminderQueue instead, because `dispatcher` only writes to the
 * log and marking rows SENT on the strength of that would be a lie. This is
 * the seam a real WhatsApp Business API gateway plugs into: replace
 * `dispatcher`, then point a cron here.
 */
export async function dispatchDueReminders(): Promise<void> {
  const user = await assertStaff();
  const now = new Date();

  await queueRepeatOverdueReminders(now);

  await cancelSettledReminders(now);

  const sendable = await db.notification.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: now },
      installment: { status: { in: ["PENDING", "PARTIAL"] } },
    },
    include: { customer: { select: { phone: true } } },
    take: 200,
  });

  if (!sendable.length) {
    revalidatePath("/notifications");
    return;
  }

  const results = await dispatcher(
    sendable.map((n) => ({
      id: n.id,
      channel: n.channel,
      message: n.message,
      phone: n.customer.phone,
    })),
  );

  await db.$transaction(
    results.map((r) =>
      db.notification.update({
        where: { id: r.id },
        data: r.ok
          ? { status: "SENT", sentAt: new Date(), error: null }
          : { status: "FAILED", error: r.error ?? "Delivery failed" },
      }),
    ),
  );

  await recordAudit(user.id, "DISPATCH", "Notification", undefined, { count: results.length });
  revalidatePath("/notifications");
}

/**
 * Overdue reminders repeat every OVERDUE_REPEAT_DAYS. The unique index is on
 * (installmentId, kind), so repeats are modelled by re-arming the existing
 * OVERDUE row rather than inserting duplicates.
 */
async function queueRepeatOverdueReminders(now: Date): Promise<void> {
  const today = startOfDay(now);

  const sentOverdue = await db.notification.findMany({
    where: {
      kind: "OVERDUE",
      status: "SENT",
      sentAt: { lte: addDays(today, -OVERDUE_REPEAT_DAYS) },
      installment: { status: { in: ["PENDING", "PARTIAL"] } },
    },
    select: { id: true },
    take: 200,
  });

  if (sentOverdue.length) {
    await db.notification.updateMany({
      where: { id: { in: sentOverdue.map((n) => n.id) } },
      data: { status: "PENDING", scheduledFor: now },
    });
  }
}

/**
 * An EMI settled since queueing must not be chased.
 */
async function cancelSettledReminders(now: Date): Promise<number> {
  const stale = await db.notification.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: now },
      installment: { status: { in: ["PAID", "WAIVED"] } },
    },
    select: { id: true },
    take: 200,
  });
  if (!stale.length) return 0;

  await db.notification.updateMany({
    where: { id: { in: stale.map((n) => n.id) } },
    data: { status: "CANCELLED" },
  });
  return stale.length;
}

/**
 * Brings the queue up to date without delivering anything: tops up repeat
 * overdue reminders and drops any queued against an EMI that has since been
 * paid or waived. This is what the Reminders screen calls, because delivery
 * is currently a person pressing send in WhatsApp.
 */
export async function refreshReminderQueue(): Promise<void> {
  await assertStaff();
  const now = new Date();
  await queueRepeatOverdueReminders(now);
  await cancelSettledReminders(now);
  revalidatePath("/notifications");
}

/**
 * Records that a member of staff has sent a reminder by hand on WhatsApp.
 *
 * Deliberately separate from opening the click-to-chat link: nothing here
 * can observe whether the message was actually sent, so the ledger records
 * what a person confirms rather than what we assume. The overdue repeat
 * cadence keys off sentAt, so this also drives the follow-up in
 * OVERDUE_REPEAT_DAYS days.
 */
export async function markNotificationSent(formData: FormData): Promise<void> {
  const user = await assertStaff();
  const id = String(formData.get("id"));
  await db.notification.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date(), error: null },
  });
  await recordAudit(user.id, "SEND", "Notification", id, { channel: "WHATSAPP", manual: true });
  revalidatePath("/notifications");
}

export async function cancelNotification(formData: FormData): Promise<void> {
  const user = await assertStaff();
  const id = String(formData.get("id"));
  await db.notification.update({ where: { id }, data: { status: "CANCELLED" } });
  await recordAudit(user.id, "CANCEL", "Notification", id);
  revalidatePath("/notifications");
}

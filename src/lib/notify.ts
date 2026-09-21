/**
 * EMI reminders (scope 3.6).
 *
 * The scope leaves the channel and the overdue cadence open (section 5, items
 * 7 and 8), so this module only builds and queues the messages. Actual
 * delivery goes through a single `Dispatcher` seam: today it writes to the log
 * so the queue is fully exercisable, and an SMS/WhatsApp gateway drops in by
 * replacing `dispatcher` without touching any caller.
 */
import { addDays, formatDate, startOfDay } from "./dates";
import type { NotificationChannel, NotificationKind } from "./enums";

export const DEFAULT_CHANNEL: NotificationChannel = "WHATSAPP";

/** Overdue reminders repeat on this cadence until the EMI is settled. */
export const OVERDUE_REPEAT_DAYS = 3;

type InstallmentForReminder = {
  id: string;
  seq: number;
  dueDate: Date;
  totalPaise: number;
};

type LoanContext = {
  loanId: string;
  loanCode: string;
  customerId: string;
  customerName: string;
};

/**
 * Reminder text. Deliberately carries the loan number and not the amount:
 * these arrive on WhatsApp, where a lock-screen preview is readable by
 * anyone holding the phone, and shop-owner borrowers often share a handset.
 * The loan number identifies the debt for the customer without disclosing
 * what they owe to whoever happens to be looking.
 */
export function reminderMessage(
  kind: NotificationKind,
  inst: InstallmentForReminder,
  ctx: LoanContext,
): string {
  const due = formatDate(inst.dueDate);
  const who = ctx.customerName.split(" ")[0];

  switch (kind) {
    case "BEFORE_DUE":
      return `Dear ${who}, EMI no. ${inst.seq} on loan ${ctx.loanCode} is due tomorrow (${due}). Please keep it ready. - Malganga Finance`;
    case "ON_DUE":
      return `Dear ${who}, EMI no. ${inst.seq} on loan ${ctx.loanCode} is due today (${due}). Kindly pay to avoid an overdue entry. - Malganga Finance`;
    case "OVERDUE":
      return `Dear ${who}, EMI no. ${inst.seq} on loan ${ctx.loanCode} (due ${due}) is still pending. Please clear it at the earliest. - Malganga Finance`;
  }
}

/**
 * Phone numbers are entered by hand, so they arrive as "9822011001",
 * "+91 98220 11001" or "09822011001". wa.me needs digits only, with the
 * country code and no plus. Returns null when the number cannot be read as
 * an Indian mobile, so the caller can hide the link rather than open
 * WhatsApp on a wrong number.
 */
export function toWhatsappNumber(phone: string, countryCode = "91"): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return countryCode + digits;
  if (digits.length === 11 && digits.startsWith("0")) return countryCode + digits.slice(1);
  if (digits.length === 12 && digits.startsWith(countryCode)) return digits;
  return null;
}

/**
 * Click-to-chat link: opens WhatsApp with the reminder pre-filled, for a
 * member of staff to send. No API, no message templates, no per-message
 * cost - and nothing is delivered until a human presses send, which is why
 * the queue is only marked sent by hand.
 */
export function whatsappLink(phone: string, message: string): string | null {
  const number = toWhatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

function scheduledFor(kind: NotificationKind, dueDate: Date): Date {
  const due = startOfDay(dueDate);
  if (kind === "BEFORE_DUE") return addDays(due, -1);
  if (kind === "ON_DUE") return due;
  return addDays(due, 1);
}

/** One BEFORE_DUE / ON_DUE / OVERDUE row per installment, ready to queue. */
export function buildInstallmentReminders(
  installments: InstallmentForReminder[],
  ctx: LoanContext,
  channel: NotificationChannel = DEFAULT_CHANNEL,
) {
  const kinds: NotificationKind[] = ["BEFORE_DUE", "ON_DUE", "OVERDUE"];
  return installments.flatMap((inst) =>
    kinds.map((kind) => ({
      customerId: ctx.customerId,
      loanId: ctx.loanId,
      installmentId: inst.id,
      kind,
      channel,
      scheduledFor: scheduledFor(kind, inst.dueDate),
      message: reminderMessage(kind, inst, ctx),
      status: "PENDING",
    })),
  );
}

export type DispatchTarget = {
  id: string;
  channel: string;
  message: string;
  phone: string;
};

export type DispatchResult = { id: string; ok: boolean; error?: string };

export type Dispatcher = (targets: DispatchTarget[]) => Promise<DispatchResult[]>;

/**
 * Stand-in gateway. Replace with the provider Malganga selects (section 5,
 * item 7); the contract is this function signature and nothing else.
 */
export const logDispatcher: Dispatcher = async (targets) => {
  for (const t of targets) {
    console.info(`[notify:${t.channel}] -> ${t.phone}: ${t.message}`);
  }
  return targets.map((t) => ({ id: t.id, ok: true }));
};

export const dispatcher: Dispatcher = logDispatcher;

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
import { formatMoney } from "./money";

export const DEFAULT_CHANNEL: NotificationChannel = "SMS";

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
  customerId: string;
  customerName: string;
};

export function reminderMessage(
  kind: NotificationKind,
  inst: InstallmentForReminder,
  ctx: LoanContext,
): string {
  const amount = formatMoney(inst.totalPaise);
  const due = formatDate(inst.dueDate);
  const who = ctx.customerName.split(" ")[0];

  switch (kind) {
    case "BEFORE_DUE":
      return `Dear ${who}, your EMI no. ${inst.seq} of ${amount} is due tomorrow (${due}). Please keep the amount ready. - Malganga Finance`;
    case "ON_DUE":
      return `Dear ${who}, your EMI no. ${inst.seq} of ${amount} is due today (${due}). Kindly pay to avoid an overdue entry. - Malganga Finance`;
    case "OVERDUE":
      return `Dear ${who}, EMI no. ${inst.seq} of ${amount} (due ${due}) is still pending. Please clear it at the earliest. - Malganga Finance`;
  }
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

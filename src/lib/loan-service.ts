/**
 * Loan lifecycle: disbursement, payment allocation and the derived states the
 * rest of the app reads. Kept in one place so every caller (server actions,
 * reports, seed) allocates money the same way.
 */
import type { Prisma, PrismaClient } from "@prisma/client";

import { startOfDay } from "./dates";
import { buildSchedule, disbursementOf, settlesFirstInstallment, type ScheduleInput } from "./emi";
import type { LoanFrequency, LoanStructure, UpfrontMode } from "./enums";
import { buildInstallmentReminders } from "./notify";

type Tx = Prisma.TransactionClient | PrismaClient;

export type CreateLoanInput = {
  customerId: string;
  principalPaise: number;
  interestRatePct: number;
  tenure: number;
  frequency: LoanFrequency;
  structure: LoanStructure;
  disbursedOn: Date;
  disbursementMode: string;
  firstEmiOn: Date;
  upfrontMode: UpfrontMode;
  notes?: string | null;
};

/** MF-0001, MF-0002, ... — human-quotable and sortable. */
export async function nextCode(tx: Tx, entity: "loan" | "customer" | "investor"): Promise<string> {
  const prefix = { loan: "LN", customer: "CU", investor: "IN" }[entity];
  const model = tx[entity] as { count: () => Promise<number> };
  const count = await model.count();
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export function scheduleInputFor(input: CreateLoanInput): ScheduleInput {
  return {
    principalPaise: input.principalPaise,
    interestRatePct: input.interestRatePct,
    tenure: input.tenure,
    frequency: input.frequency,
    structure: input.structure,
    firstEmiOn: input.firstEmiOn,
  };
}

/**
 * Creates the loan, its full EMI schedule and the reminder queue in one
 * transaction. Under SETTLES_EMI_1, installment 1 is marked settled at
 * disbursement and never enters the reminder queue.
 */
export async function createLoanWithSchedule(tx: Tx, input: CreateLoanInput) {
  const schedule = buildSchedule(scheduleInputFor(input));
  const disbursement = disbursementOf(
    input.principalPaise,
    schedule,
    input.upfrontMode,
    input.tenure,
    input.frequency,
  );

  if (disbursement.netPaise <= 0) {
    throw new Error(
      "The upfront deduction equals or exceeds the loan amount - nothing would reach the customer",
    );
  }

  const settlesFirst = settlesFirstInstallment(input.upfrontMode);

  const loan = await tx.loan.create({
    data: {
      code: await nextCode(tx, "loan"),
      customerId: input.customerId,
      principalPaise: input.principalPaise,
      interestRatePct: input.interestRatePct,
      tenure: input.tenure,
      frequency: input.frequency,
      structure: input.structure,
      disbursedOn: startOfDay(input.disbursedOn),
      disbursementMode: input.disbursementMode,
      firstEmiOn: startOfDay(input.firstEmiOn),
      lastEmiOn: schedule.lastEmiOn,
      upfrontMode: input.upfrontMode,
      netDisbursedPaise: disbursement.netPaise,
      notes: input.notes ?? null,
      installments: {
        create: schedule.rows.map((row) => {
          const settledUpfront = settlesFirst && row.seq === 1;
          return {
            seq: row.seq,
            dueDate: row.dueDate,
            principalPaise: row.principalPaise,
            interestPaise: row.interestPaise,
            totalPaise: row.totalPaise,
            paidPaise: settledUpfront ? row.totalPaise : 0,
            status: settledUpfront ? "DEDUCTED_AT_DISBURSAL" : "PENDING",
            paidOn: settledUpfront ? startOfDay(input.disbursedOn) : null,
          };
        }),
      },
    },
    include: { installments: true, customer: true },
  });

  const reminders = buildInstallmentReminders(
    loan.installments.filter((i) => i.status !== "DEDUCTED_AT_DISBURSAL"),
    { loanId: loan.id, customerId: loan.customerId, customerName: loan.customer.name },
  );
  if (reminders.length) await tx.notification.createMany({ data: reminders });

  return loan;
}

function statusFor(paid: number, total: number): string {
  if (paid >= total) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "PENDING";
}

/**
 * Applies a receipt to the loan. Money lands on the named installment first,
 * then flows to the oldest still-open installments. Any surplus beyond the
 * schedule is left recorded on the payment (advance/closure amount) rather
 * than silently discarded.
 */
export async function applyPayment(
  tx: Tx,
  args: {
    loanId: string;
    installmentId?: string | null;
    amountPaise: number;
    mode: string;
    receivedOn: Date;
    reference?: string | null;
    note?: string | null;
    recordedById?: string | null;
  },
) {
  const installments = await tx.installment.findMany({
    where: { loanId: args.loanId },
    orderBy: { seq: "asc" },
  });
  if (!installments.length) throw new Error("Loan has no schedule");

  const open = installments.filter((i) => i.status !== "PAID" && i.status !== "WAIVED" && i.status !== "DEDUCTED_AT_DISBURSAL");

  // Named installment gets served first, then the rest oldest-first.
  const order = args.installmentId
    ? [
        ...open.filter((i) => i.id === args.installmentId),
        ...open.filter((i) => i.id !== args.installmentId),
      ]
    : open;

  let remaining = args.amountPaise;
  const touched: string[] = [];

  for (const inst of order) {
    if (remaining <= 0) break;
    const owed = inst.totalPaise - inst.paidPaise;
    if (owed <= 0) continue;
    const applied = Math.min(owed, remaining);
    const paid = inst.paidPaise + applied;
    const status = statusFor(paid, inst.totalPaise);

    await tx.installment.update({
      where: { id: inst.id },
      data: {
        paidPaise: paid,
        status,
        paidOn: status === "PAID" ? startOfDay(args.receivedOn) : inst.paidOn,
      },
    });

    if (status === "PAID") {
      await tx.notification.updateMany({
        where: { installmentId: inst.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
    }

    remaining -= applied;
    touched.push(inst.id);
  }

  const payment = await tx.payment.create({
    data: {
      loanId: args.loanId,
      installmentId: args.installmentId || touched[0] || null,
      amountPaise: args.amountPaise,
      mode: args.mode,
      receivedOn: startOfDay(args.receivedOn),
      reference: args.reference ?? null,
      note: args.note ?? null,
      recordedById: args.recordedById ?? null,
    },
  });

  await refreshLoanStatus(tx, args.loanId);
  return { payment, unallocatedPaise: Math.max(0, remaining) };
}

/** Closes a loan once nothing is outstanding; reopens it if a payment is reversed. */
export async function refreshLoanStatus(tx: Tx, loanId: string): Promise<void> {
  const remaining = await tx.installment.count({
    where: { loanId, status: { in: ["PENDING", "PARTIAL"] } },
  });
  const loan = await tx.loan.findUnique({ where: { id: loanId }, select: { status: true } });
  if (!loan) return;

  if (remaining === 0 && loan.status === "ACTIVE") {
    await tx.loan.update({ where: { id: loanId }, data: { status: "CLOSED" } });
  } else if (remaining > 0 && loan.status === "CLOSED") {
    await tx.loan.update({ where: { id: loanId }, data: { status: "ACTIVE" } });
  }
}

/** Reverses a receipt and rebuilds the affected installments from what remains. */
export async function reversePayment(tx: Tx, paymentId: string): Promise<void> {
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Payment not found");

  await tx.payment.delete({ where: { id: paymentId } });

  const [installments, payments] = await Promise.all([
    tx.installment.findMany({ where: { loanId: payment.loanId }, orderBy: { seq: "asc" } }),
    tx.payment.findMany({ where: { loanId: payment.loanId }, orderBy: { receivedOn: "asc" } }),
  ]);

  // Reset then replay: cheaper to reason about than un-picking one allocation.
  for (const inst of installments) {
    if (inst.status === "DEDUCTED_AT_DISBURSAL" || inst.status === "WAIVED") continue;
    await tx.installment.update({
      where: { id: inst.id },
      data: { paidPaise: 0, status: "PENDING", paidOn: null },
    });
  }

  let pool = payments.reduce((a, p) => a + p.amountPaise, 0);
  for (const inst of installments) {
    if (pool <= 0) break;
    if (inst.status === "DEDUCTED_AT_DISBURSAL" || inst.status === "WAIVED") continue;
    const applied = Math.min(inst.totalPaise, pool);
    pool -= applied;
    await tx.installment.update({
      where: { id: inst.id },
      data: {
        paidPaise: applied,
        status: statusFor(applied, inst.totalPaise),
        paidOn: applied >= inst.totalPaise ? inst.dueDate : null,
      },
    });
  }

  await refreshLoanStatus(tx, payment.loanId);
}

export type InstallmentLike = {
  dueDate: Date;
  totalPaise: number;
  paidPaise: number;
  status: string;
};

/** Overdue is derived, never stored — so it is correct without a nightly job. */
export function isOverdue(inst: InstallmentLike, today = new Date()): boolean {
  if (inst.status === "PAID" || inst.status === "WAIVED" || inst.status === "DEDUCTED_AT_DISBURSAL") {
    return false;
  }
  return startOfDay(inst.dueDate) < startOfDay(today);
}

export function outstandingOf(installments: InstallmentLike[]): number {
  return installments.reduce((a, i) => a + Math.max(0, i.totalPaise - i.paidPaise), 0);
}

export function overdueOf(installments: InstallmentLike[], today = new Date()): number {
  return installments
    .filter((i) => isOverdue(i, today))
    .reduce((a, i) => a + Math.max(0, i.totalPaise - i.paidPaise), 0);
}

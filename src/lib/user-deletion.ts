/**
 * Whether a login may be deleted outright, and why not when it may not.
 *
 * Deleting a user does not delete their work. AuditLog.userId,
 * Payment.recordedById and Expense.recordedById are all ON DELETE SET NULL, so
 * the rows survive with no name attached - and on a lending ledger that is
 * worse than keeping a disabled account around. Six months after a cash
 * discrepancy, "who recorded this payment" needs an answer.
 *
 * So a login that has done anything gets disabled; only one that has never
 * been used can be removed.
 */

export type UserDeletionContext = {
  isSelf: boolean;
  isLastActiveAdmin: boolean;
  auditEntries: number;
  paymentsRecorded: number;
  expensesRecorded: number;
};

/** Number of records that would lose their attribution if the login went. */
export function linkedRecordCount(ctx: UserDeletionContext): number {
  return ctx.auditEntries + ctx.paymentsRecorded + ctx.expensesRecorded;
}

/** null when the login may be deleted; otherwise the reason it may not. */
export function userDeletionBlocker(ctx: UserDeletionContext): string | null {
  if (ctx.isSelf) return "You cannot delete your own login";
  if (ctx.isLastActiveAdmin) return "At least one active administrator is required";

  const linked = linkedRecordCount(ctx);
  if (linked > 0) {
    return `This login is named on ${linked} record${linked === 1 ? "" : "s"}. Disable it instead, so its name stays on them.`;
  }
  return null;
}

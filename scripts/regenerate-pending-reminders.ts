/**
 * Rewrites the text of reminders that have not gone out yet:
 * `npm run reminders:regenerate`.
 *
 * Reminder text is snapshotted into Notification.message when a loan is
 * disbursed, so editing reminderMessage() only affects loans created
 * afterwards - everything already queued keeps the old wording. Run this
 * after any change to the template.
 *
 * Only PENDING and FAILED rows are touched. A SENT or CANCELLED row records
 * what was actually put in front of a customer, and rewriting that would
 * falsify the audit trail.
 */
import { PrismaClient } from "@prisma/client";

import { reminderMessage } from "../src/lib/notify";
import type { NotificationKind } from "../src/lib/enums";

const db = new PrismaClient();

async function main() {
  const rows = await db.notification.findMany({
    where: { status: { in: ["PENDING", "FAILED"] } },
    include: {
      loan: { select: { id: true, code: true } },
      customer: { select: { id: true, name: true } },
      installment: { select: { id: true, seq: true, dueDate: true, totalPaise: true } },
    },
  });

  console.log(`\n${rows.length} unsent reminder(s) found.`);

  const changes = rows
    .map((n) => ({
      id: n.id,
      before: n.message,
      after: reminderMessage(n.kind as NotificationKind, n.installment, {
        loanId: n.loan.id,
        loanCode: n.loan.code,
        customerId: n.customer.id,
        customerName: n.customer.name,
      }),
    }))
    .filter((c) => c.before !== c.after);

  if (!changes.length) {
    console.log("All already current. Nothing to do.\n");
    return;
  }

  console.log(`${changes.length} need rewriting. Example:\n`);
  console.log(`  before: ${changes[0].before}`);
  console.log(`  after:  ${changes[0].after}\n`);

  await db.$transaction(
    changes.map((c) => db.notification.update({ where: { id: c.id }, data: { message: c.after } })),
  );

  console.log(`Rewrote ${changes.length} reminder(s).\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

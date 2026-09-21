/**
 * Proves the SQL aggregate in reports.ts agrees with the row-by-row loop it
 * replaced: `npm run verify:summary`.
 *
 * The rewrite moved overdue classification out of JavaScript and into
 * Postgres. Getting that wrong by one day boundary would silently reclassify
 * which borrowers appear overdue - on the screen staff use to decide who gets
 * chased for money - so the two implementations are run over identical rows
 * and compared rather than eyeballed.
 *
 * Everything happens inside a transaction that is rolled back, so this is
 * safe against any database, including production. It reads and writes only
 * within that transaction and leaves nothing behind.
 */
import { PrismaClient } from "@prisma/client";

import { addDays, startOfDay } from "../src/lib/dates";
import { isOverdue } from "../src/lib/loan-service";
import { installmentBuckets, type InstallmentBuckets } from "../src/lib/reports";

const db = new PrismaClient();
const today = startOfDay(new Date());
const weekEnd = addDays(today, 7);

/** The original implementation, kept verbatim as the reference. */
function referenceBuckets(
  installments: { dueDate: Date; totalPaise: number; paidPaise: number; status: string }[],
): InstallmentBuckets {
  let outstandingPaise = 0;
  let overduePaise = 0;
  let overdueCount = 0;
  let dueThisWeekPaise = 0;

  for (const inst of installments) {
    const owed = inst.totalPaise - inst.paidPaise;
    if (owed <= 0) continue;
    outstandingPaise += owed;
    if (isOverdue(inst, today)) {
      overduePaise += owed;
      overdueCount++;
    } else if (inst.dueDate < weekEnd) {
      dueThisWeekPaise += owed;
    }
  }
  return { outstandingPaise, overduePaise, overdueCount, dueThisWeekPaise };
}

/**
 * One installment per interesting case. The day boundaries matter most: an
 * installment due at 23:59 today is not overdue, one due at 00:00 today is
 * not overdue, one due a second before midnight last night is.
 */
function fixtures(): { offsetDays: number; hours: number; total: number; paid: number; status: string }[] {
  return [
    { offsetDays: -30, hours: 0, total: 700000, paid: 0, status: "PENDING" }, // long overdue
    { offsetDays: -1, hours: 23, total: 700000, paid: 200000, status: "PARTIAL" }, // overdue, part paid
    { offsetDays: -1, hours: 0, total: 500000, paid: 0, status: "PENDING" }, // overdue by a day
    { offsetDays: 0, hours: 0, total: 700000, paid: 0, status: "PENDING" }, // due today, midnight
    { offsetDays: 0, hours: 23, total: 300000, paid: 0, status: "PENDING" }, // due today, late
    { offsetDays: 3, hours: 12, total: 700000, paid: 100000, status: "PARTIAL" }, // this week
    { offsetDays: 6, hours: 23, total: 400000, paid: 0, status: "PENDING" }, // last hour of the week
    { offsetDays: 7, hours: 0, total: 900000, paid: 0, status: "PENDING" }, // just outside the week
    { offsetDays: 40, hours: 0, total: 900000, paid: 0, status: "PENDING" }, // far future
    { offsetDays: -5, hours: 0, total: 500000, paid: 500000, status: "PENDING" }, // owed 0, must be ignored
    { offsetDays: -5, hours: 0, total: 500000, paid: 0, status: "PAID" }, // excluded by status
    { offsetDays: -5, hours: 0, total: 500000, paid: 0, status: "WAIVED" }, // excluded by status
  ];
}

async function main() {
  const stamp = Date.now();
  let mismatch = false;

  await db
    .$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: { code: `ZZ-PARITY-${stamp}`, name: "Parity Probe", phone: "0000000000" },
      });
      const loan = await tx.loan.create({
        data: {
          code: `ZZ-PARITY-${stamp}`,
          customerId: customer.id,
          principalPaise: 10000000,
          interestRatePct: 3,
          tenure: 14,
          frequency: "WEEKLY",
          structure: "FLAT_UPFRONT",
          disbursedOn: today,
          disbursementMode: "CASH",
          firstEmiOn: today,
          lastEmiOn: addDays(today, 98),
          netDisbursedPaise: 10000000,
        },
      });

      await tx.installment.createMany({
        data: fixtures().map((f, i) => {
          const due = addDays(today, f.offsetDays);
          due.setHours(f.hours, 0, 0, 0);
          return {
            loanId: loan.id,
            seq: i + 1,
            dueDate: due,
            totalPaise: f.total,
            paidPaise: f.paid,
            status: f.status,
          };
        }),
      });

      // Both implementations see every row in the table, fixtures included.
      const rows = await tx.installment.findMany({
        where: { status: { in: ["PENDING", "PARTIAL"] } },
        select: { dueDate: true, totalPaise: true, paidPaise: true, status: true },
      });

      const expected = referenceBuckets(rows);
      const actual = await installmentBuckets(tx, today, weekEnd);

      console.log(`\nCompared over ${rows.length} open installment(s)\n`);
      for (const key of Object.keys(expected) as (keyof InstallmentBuckets)[]) {
        const same = expected[key] === actual[key];
        if (!same) mismatch = true;
        console.log(
          `  ${same ? "ok  " : "FAIL"}  ${key.padEnd(18)} loop=${expected[key]}  sql=${actual[key]}`,
        );
      }

      throw new Error("__rollback__");
    })
    .catch((err: Error) => {
      if (err.message !== "__rollback__") throw err;
    });

  console.log(`\nFixtures rolled back.\n${mismatch ? "MISMATCH - do not ship." : "Implementations agree."}\n`);
  if (mismatch) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

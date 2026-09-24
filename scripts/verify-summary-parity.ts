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

import { addDays, daysBetween, startOfDay, startOfMonth } from "../src/lib/dates";
import { isOverdue } from "../src/lib/loan-service";
import {
  collectionHealth,
  installmentBuckets,
  type AgeingBucket,
  type CollectionHealth,
  type InstallmentBuckets,
} from "../src/lib/reports";

const db = new PrismaClient();
const today = startOfDay(new Date());
const weekEnd = addDays(today, 7);
const monthStart = startOfMonth(today);

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
 * Reference for collectionHealth, written with day arithmetic rather than the
 * timestamp bounds the SQL uses - two formulations agreeing is evidence; one
 * formulation checked against a copy of itself is not.
 */
function referenceHealth(
  installments: { dueDate: Date; totalPaise: number; paidPaise: number; status: string }[],
): CollectionHealth {
  let dueThisMonthPaise = 0;
  let collectedAgainstDuePaise = 0;
  const ageing: CollectionHealth["ageing"] = {
    d1_7: { paise: 0, count: 0 },
    d8_30: { paise: 0, count: 0 },
    d31: { paise: 0, count: 0 },
  };

  for (const inst of installments) {
    const dayOfDue = startOfDay(inst.dueDate);
    const inMonthSoFar = dayOfDue >= monthStart && dayOfDue <= today;
    if (inst.status !== "WAIVED" && inMonthSoFar) {
      dueThisMonthPaise += inst.totalPaise;
      collectedAgainstDuePaise += Math.min(inst.paidPaise, inst.totalPaise);
    }

    const owed = inst.totalPaise - inst.paidPaise;
    const open = inst.status === "PENDING" || inst.status === "PARTIAL";
    if (open && owed > 0 && isOverdue(inst, today)) {
      const late = daysBetween(inst.dueDate, today);
      const bucket: AgeingBucket = late <= 7 ? "d1_7" : late <= 30 ? "d8_30" : "d31";
      ageing[bucket].paise += owed;
      ageing[bucket].count += 1;
    }
  }

  return { dueThisMonthPaise, collectedAgainstDuePaise, ageing };
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
    // Ageing boundaries: 7 days late is the last day of the first bucket,
    // 8 the first of the second, 31 the first of the third.
    { offsetDays: -7, hours: 0, total: 110000, paid: 0, status: "PENDING" },
    { offsetDays: -7, hours: 22, total: 120000, paid: 0, status: "PENDING" },
    { offsetDays: -8, hours: 0, total: 130000, paid: 30000, status: "PARTIAL" },
    { offsetDays: -31, hours: 0, total: 140000, paid: 0, status: "PENDING" },
    { offsetDays: -90, hours: 9, total: 150000, paid: 0, status: "PENDING" },
    // Overpaid EMI this month: must not lift the collection rate past 100%.
    { offsetDays: -2, hours: 0, total: 300000, paid: 450000, status: "PAID" },
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

      const all = await tx.installment.findMany({
        select: { dueDate: true, totalPaise: true, paidPaise: true, status: true },
      });
      const expectHealth = referenceHealth(all);
      const actualHealth = await collectionHealth(tx, today, monthStart);

      const flat = (h: CollectionHealth): Record<string, number> => ({
        dueThisMonth: h.dueThisMonthPaise,
        collectedAgainstDue: h.collectedAgainstDuePaise,
        "ageing 1-7 paise": h.ageing.d1_7.paise,
        "ageing 1-7 count": h.ageing.d1_7.count,
        "ageing 8-30 paise": h.ageing.d8_30.paise,
        "ageing 8-30 count": h.ageing.d8_30.count,
        "ageing 31+ paise": h.ageing.d31.paise,
        "ageing 31+ count": h.ageing.d31.count,
      });
      const e = flat(expectHealth);
      const a = flat(actualHealth);
      console.log(`\nCollection health over ${all.length} installment(s)\n`);
      for (const key of Object.keys(e)) {
        const same = e[key] === a[key];
        if (!same) mismatch = true;
        console.log(`  ${same ? "ok  " : "FAIL"}  ${key.padEnd(20)} days=${e[key]}  sql=${a[key]}`);
      }
      if (actualHealth.collectedAgainstDuePaise > actualHealth.dueThisMonthPaise) {
        mismatch = true;
        console.log("  FAIL  collected exceeds due - overpayment leaked into the rate");
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

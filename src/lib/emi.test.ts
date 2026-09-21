/**
 * Runnable check for the money-critical paths: `npm test`.
 * Plain asserts on purpose - no framework, no fixtures.
 */
import assert from "node:assert/strict";

import { addMonths, daysBetween } from "./dates";
import { buildSchedule, disbursementOf } from "./emi";
import { formatMoney, toPaise } from "./money";

const firstEmiOn = new Date(2026, 0, 8); // 8 Jan 2026

function flatUpfrontExample() {
  // Scope document section 4.1, worked example.
  const schedule = buildSchedule({
    principalPaise: toPaise(100000),
    interestRatePct: 3,
    tenure: 14,
    frequency: "WEEKLY",
    structure: "FLAT_UPFRONT",
    firstEmiOn,
  });

  assert.equal(schedule.rows.length, 14);
  for (let i = 0; i < 13; i++) {
    assert.equal(schedule.rows[i].totalPaise, toPaise(7000), `EMI ${i + 1} should be 7,000`);
  }
  assert.equal(schedule.rows[13].totalPaise, toPaise(9000), "EMI 14 should be 9,000");
  assert.equal(schedule.totalPayablePaise, toPaise(100000));

  // Weekly cadence.
  assert.equal(daysBetween(schedule.rows[0].dueDate, schedule.rows[1].dueDate), 7);
  assert.equal(daysBetween(firstEmiOn, schedule.lastEmiOn), 13 * 7);

  // Reading A - the scope wording taken literally: EMI 1 is settled by the
  // withholding and only 13 EMIs are collected. It nets the lender nothing.
  const literal = disbursementOf(toPaise(100000), schedule, "SETTLES_EMI_1", 14, "WEEKLY");
  assert.equal(literal.netPaise, toPaise(93000), "customer receives 93,000 in hand");
  assert.equal(literal.collectPaise, toPaise(93000), "13 remaining EMIs total 93,000");
  assert.equal(literal.marginPaise, 0, "the literal reading of scope 4.1 earns nothing");

  // Reading B - the withheld EMI is an upfront charge and the full schedule is
  // still collected. This is the only reading with a viable margin.
  const charged = disbursementOf(toPaise(100000), schedule, "EXTRA_CHARGE", 14, "WEEKLY");
  assert.equal(charged.netPaise, toPaise(93000));
  assert.equal(charged.collectPaise, toPaise(100000));
  assert.equal(charged.marginPaise, toPaise(7000));
  assert.ok(
    charged.effectiveMonthlyRatePct > 2.2 && charged.effectiveMonthlyRatePct < 2.5,
    `expected ~2.33%/month, got ${charged.effectiveMonthlyRatePct}`,
  );

  const none = disbursementOf(toPaise(100000), schedule, "NONE", 14, "WEEKLY");
  assert.equal(none.netPaise, toPaise(100000), "no withholding pays out in full");
  assert.equal(none.marginPaise, 0, "a flat schedule with no withholding earns nothing");
}

function scheduleAlwaysSumsToPayable() {
  // Awkward amounts and tenures must never lose or invent a paisa.
  for (const principal of [1000, 7777, 100000, 133333, 250000]) {
    for (const tenure of [1, 2, 5, 14, 23, 52]) {
      for (const structure of ["FLAT_UPFRONT", "INTEREST_ONLY", "INTEREST_PRINCIPAL"] as const) {
        const s = buildSchedule({
          principalPaise: toPaise(principal),
          interestRatePct: 3,
          tenure,
          frequency: "WEEKLY",
          structure,
          firstEmiOn,
        });
        const summed = s.rows.reduce((a, r) => a + r.totalPaise, 0);
        assert.equal(summed, s.totalPayablePaise, `${structure} ${principal}/${tenure}`);
        for (const r of s.rows) {
          assert.equal(r.principalPaise + r.interestPaise, r.totalPaise, "split must reconcile");
          assert.ok(r.totalPaise > 0, `non-positive EMI in ${structure} ${principal}/${tenure}`);
        }
        const principalBack = s.rows.reduce((a, r) => a + r.principalPaise, 0);
        if (structure !== "INTEREST_PRINCIPAL") {
          assert.equal(principalBack, toPaise(principal), `${structure} principal must reconcile`);
        }
      }
    }
  }
}

function interestOnlyShape() {
  const s = buildSchedule({
    principalPaise: toPaise(100000),
    interestRatePct: 3,
    tenure: 6,
    frequency: "MONTHLY",
    structure: "INTEREST_ONLY",
    firstEmiOn,
  });
  assert.equal(s.rows[0].totalPaise, toPaise(3000), "monthly interest-only EMI = 3% of 1,00,000");
  assert.equal(s.rows[0].principalPaise, 0);
  assert.equal(s.rows[5].principalPaise, toPaise(100000), "principal falls due last");
  assert.equal(s.totalInterestPaise, toPaise(18000));
}

function monthEndClamping() {
  const s = buildSchedule({
    principalPaise: toPaise(60000),
    interestRatePct: 3,
    tenure: 3,
    frequency: "MONTHLY",
    structure: "FLAT_UPFRONT",
    firstEmiOn: new Date(2026, 0, 31), // 31 Jan
  });
  assert.equal(s.rows[1].dueDate.getMonth(), 1);
  assert.equal(s.rows[1].dueDate.getDate(), 28, "31 Jan + 1 month clamps to 28 Feb 2026");
  assert.equal(addMonths(new Date(2024, 0, 31), 1).getDate(), 29, "leap year clamps to 29 Feb");
}

function rejectsBadInput() {
  assert.throws(() =>
    buildSchedule({
      principalPaise: 0,
      interestRatePct: 3,
      tenure: 5,
      frequency: "WEEKLY",
      structure: "FLAT_UPFRONT",
      firstEmiOn,
    }),
  );
  assert.throws(() =>
    buildSchedule({
      principalPaise: toPaise(1000),
      interestRatePct: 3,
      tenure: 0,
      frequency: "WEEKLY",
      structure: "FLAT_UPFRONT",
      firstEmiOn,
    }),
  );
}

function moneyFormatting() {
  assert.equal(toPaise("1,00,000"), 10_000_000);
  assert.equal(toPaise("₹ 7,000"), 700_000);
  assert.equal(formatMoney(10_000_000).replace(/ /g, " "), "₹1,00,000");
}

const checks = [
  flatUpfrontExample,
  scheduleAlwaysSumsToPayable,
  interestOnlyShape,
  monthEndClamping,
  rejectsBadInput,
  moneyFormatting,
];

let failed = 0;
for (const check of checks) {
  try {
    check();
    console.log(`  ok   ${check.name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${check.name}\n       ${(err as Error).message}`);
  }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nAll ${checks.length} checks passed`);
process.exit(failed ? 1 : 0);

/**
 * EMI schedule engine.
 *
 * Scope doc section 4.1 gives exactly one worked example and section 5 item 4
 * asks for the general rule. Until that answer arrives, FLAT_UPFRONT is
 * calibrated to reproduce the worked example exactly:
 *
 *   ₹1,00,000 over 14 weekly EMIs -> 13 x ₹7,000 + 1 x ₹9,000,
 *   first EMI withheld, so ₹93,000 reaches the customer.
 *
 * The knobs that decide that shape (`roundToPaise`, and the choice of
 * structure) are inputs, not constants, so the rule can be re-tuned from
 * Settings once Malganga confirms it, without touching this file.
 */

import { addDays, addMonths, startOfDay } from "./dates";
import type { LoanFrequency, LoanStructure, UpfrontMode } from "./enums";

export type ScheduleInput = {
  principalPaise: number;
  /** Monthly interest rate in percent, e.g. 3 for 3%. */
  interestRatePct: number;
  /** Number of installments. */
  tenure: number;
  frequency: LoanFrequency;
  structure: LoanStructure;
  firstEmiOn: Date;
  /** EMI amounts are rounded down to this step; the last EMI absorbs the rest. */
  roundToPaise?: number;
};

export type ScheduleRow = {
  seq: number;
  dueDate: Date;
  principalPaise: number;
  interestPaise: number;
  totalPaise: number;
};

export type Schedule = {
  rows: ScheduleRow[];
  totalPayablePaise: number;
  totalInterestPaise: number;
  lastEmiOn: Date;
};

/** Weeks per month used to convert a monthly rate to a weekly period. */
const WEEKS_PER_MONTH = 52 / 12;

export const DEFAULT_ROUNDING_PAISE = 500 * 100; // ₹500 steps

function periodsToMonths(tenure: number, frequency: LoanFrequency): number {
  return frequency === "MONTHLY" ? tenure : tenure / WEEKS_PER_MONTH;
}

function dueDateFor(firstEmiOn: Date, seq: number, frequency: LoanFrequency): Date {
  const base = startOfDay(firstEmiOn);
  return frequency === "WEEKLY" ? addDays(base, (seq - 1) * 7) : addMonths(base, seq - 1);
}

/** Largest multiple of `step` that is <= value; falls back to value when step is unusable. */
function roundDownTo(value: number, step: number): number {
  if (step <= 0) return value;
  const rounded = Math.floor(value / step) * step;
  return rounded > 0 ? rounded : value;
}

export function buildSchedule(input: ScheduleInput): Schedule {
  const {
    principalPaise,
    interestRatePct,
    tenure,
    frequency,
    structure,
    firstEmiOn,
    roundToPaise = DEFAULT_ROUNDING_PAISE,
  } = input;

  if (!Number.isInteger(principalPaise) || principalPaise <= 0) {
    throw new Error("Principal must be a positive integer amount in paise");
  }
  if (!Number.isInteger(tenure) || tenure < 1) {
    throw new Error("Tenure must be at least 1 installment");
  }
  if (interestRatePct < 0) throw new Error("Interest rate cannot be negative");

  const months = periodsToMonths(tenure, frequency);
  const rows: ScheduleRow[] = [];

  if (structure === "FLAT_UPFRONT") {
    // Repayments total the principal exactly; the lender's return is the
    // withheld first EMI. Even instalments, remainder loaded onto the last one.
    const base = roundDownTo(Math.floor(principalPaise / tenure), roundToPaise);
    let allocated = 0;
    for (let seq = 1; seq <= tenure; seq++) {
      const isLast = seq === tenure;
      const total = isLast ? principalPaise - allocated : base;
      allocated += total;
      rows.push({
        seq,
        dueDate: dueDateFor(firstEmiOn, seq, frequency),
        principalPaise: total,
        interestPaise: 0,
        totalPaise: total,
      });
    }
  } else if (structure === "INTEREST_ONLY") {
    // Interest every period, whole principal with the final installment.
    const perPeriodMonths = months / tenure;
    const interest = Math.round(
      (principalPaise * interestRatePct * perPeriodMonths) / 100,
    );
    for (let seq = 1; seq <= tenure; seq++) {
      const isLast = seq === tenure;
      const principal = isLast ? principalPaise : 0;
      rows.push({
        seq,
        dueDate: dueDateFor(firstEmiOn, seq, frequency),
        principalPaise: principal,
        interestPaise: interest,
        totalPaise: principal + interest,
      });
    }
  } else {
    // INTEREST_PRINCIPAL: flat interest on the original principal, spread with
    // the principal across every installment.
    const totalInterest = Math.round((principalPaise * interestRatePct * months) / 100);
    const totalPayable = principalPaise + totalInterest;
    const base = roundDownTo(Math.floor(totalPayable / tenure), roundToPaise);

    let allocatedTotal = 0;
    let allocatedInterest = 0;
    for (let seq = 1; seq <= tenure; seq++) {
      const isLast = seq === tenure;
      const total = isLast ? totalPayable - allocatedTotal : base;
      const interest = isLast
        ? totalInterest - allocatedInterest
        : Math.min(Math.round(totalInterest / tenure), total);
      allocatedTotal += total;
      allocatedInterest += interest;
      rows.push({
        seq,
        dueDate: dueDateFor(firstEmiOn, seq, frequency),
        principalPaise: total - interest,
        interestPaise: interest,
        totalPaise: total,
      });
    }
  }

  const totalPayablePaise = rows.reduce((a, r) => a + r.totalPaise, 0);
  const totalInterestPaise = rows.reduce((a, r) => a + r.interestPaise, 0);

  return {
    rows,
    totalPayablePaise,
    totalInterestPaise,
    lastEmiOn: rows[rows.length - 1].dueDate,
  };
}

/**
 * Economics of a disbursement, all in paise.
 *
 * `netPaise`    - cash actually handed to the customer.
 * `collectPaise`- what the schedule will still bring in after disbursement.
 * `marginPaise` - the lender's gross return (collect - net). Surfaced in the UI
 *                 because a FLAT_UPFRONT loan under SETTLES_EMI_1 returns
 *                 exactly what was advanced, and that must not be silent.
 */
export type Disbursement = {
  netPaise: number;
  collectPaise: number;
  marginPaise: number;
  upfrontPaise: number;
  effectiveMonthlyRatePct: number;
};

export function disbursementOf(
  principalPaise: number,
  schedule: Schedule,
  upfrontMode: UpfrontMode,
  tenure: number,
  frequency: LoanFrequency,
): Disbursement {
  const firstEmi = schedule.rows[0].totalPaise;
  const upfrontPaise = upfrontMode === "NONE" ? 0 : firstEmi;
  const netPaise = principalPaise - upfrontPaise;

  // SETTLES_EMI_1 retires installment 1; EXTRA_CHARGE leaves the whole
  // schedule collectable on top of the withheld amount.
  const collectPaise =
    upfrontMode === "SETTLES_EMI_1"
      ? schedule.totalPayablePaise - firstEmi
      : schedule.totalPayablePaise;

  const marginPaise = collectPaise - netPaise;
  const months = periodsToMonths(tenure, frequency);
  const effectiveMonthlyRatePct =
    netPaise > 0 && months > 0 ? (marginPaise / netPaise / months) * 100 : 0;

  return { netPaise, collectPaise, marginPaise, upfrontPaise, effectiveMonthlyRatePct };
}

/** True when installment 1 is settled by the withholding rather than collected. */
export function settlesFirstInstallment(upfrontMode: UpfrontMode): boolean {
  return upfrontMode === "SETTLES_EMI_1";
}

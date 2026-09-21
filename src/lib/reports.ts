/**
 * Read-side aggregations for the dashboard and the report pages (scope 3.5).
 * Everything returns paise; formatting happens in the components.
 */
import { db } from "./db";
import { addDays, startOfDay, startOfMonth, startOfWeek, startOfYear } from "./dates";
import { isOverdue } from "./loan-service";

export type Period = "week" | "month" | "year";

export function periodRange(period: Period, ref = new Date()): { from: Date; to: Date } {
  const from =
    period === "week" ? startOfWeek(ref) : period === "month" ? startOfMonth(ref) : startOfYear(ref);
  const to =
    period === "week"
      ? addDays(from, 7)
      : period === "month"
        ? new Date(from.getFullYear(), from.getMonth() + 1, 1)
        : new Date(from.getFullYear() + 1, 0, 1);
  return { from, to };
}

export type PortfolioSummary = {
  customers: number;
  activeLoans: number;
  principalOutPaise: number;
  outstandingPaise: number;
  overduePaise: number;
  overdueCount: number;
  collectedPaise: number;
  dueThisWeekPaise: number;
  investorCapitalPaise: number;
  investorWithdrawnPaise: number;
  expensesPaise: number;
  cashInHandPaise: number;
};

/** One pass over the ledger, shared by the dashboard tiles and the reports page. */
export async function portfolioSummary(today = new Date()): Promise<PortfolioSummary> {
  const weekEnd = addDays(startOfDay(today), 7);

  const [customers, activeLoans, loanAgg, installments, paymentAgg, txns, expenseAgg] =
    await Promise.all([
      db.customer.count({ where: { isActive: true } }),
      db.loan.count({ where: { status: "ACTIVE" } }),
      db.loan.aggregate({
        where: { status: "ACTIVE" },
        _sum: { netDisbursedPaise: true },
      }),
      db.installment.findMany({
        where: { status: { in: ["PENDING", "PARTIAL"] } },
        select: { dueDate: true, totalPaise: true, paidPaise: true, status: true },
      }),
      db.payment.aggregate({ _sum: { amountPaise: true } }),
      db.investorTxn.groupBy({ by: ["type"], _sum: { amountPaise: true } }),
      db.expense.aggregate({ _sum: { amountPaise: true } }),
    ]);

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

  const byType = (t: string) => txns.find((x) => x.type === t)?._sum.amountPaise ?? 0;
  const investorCapitalPaise = byType("INVESTMENT");
  const investorWithdrawnPaise = byType("WITHDRAWAL") + byType("INTEREST_PAYOUT");
  const collectedPaise = paymentAgg._sum.amountPaise ?? 0;
  const expensesPaise = expenseAgg._sum.amountPaise ?? 0;
  const principalOutPaise = loanAgg._sum.netDisbursedPaise ?? 0;

  return {
    customers,
    activeLoans,
    principalOutPaise,
    outstandingPaise,
    overduePaise,
    overdueCount,
    collectedPaise,
    dueThisWeekPaise,
    investorCapitalPaise,
    investorWithdrawnPaise,
    expensesPaise,
    // Money in the business = investor capital + collections - payouts - lending - costs.
    cashInHandPaise:
      investorCapitalPaise - investorWithdrawnPaise + collectedPaise - principalOutPaise - expensesPaise,
  };
}

export type PeriodTotals = {
  collectedPaise: number;
  disbursedPaise: number;
  expensesPaise: number;
  investedPaise: number;
  paymentCount: number;
  loanCount: number;
};

export async function periodTotals(from: Date, to: Date): Promise<PeriodTotals> {
  const [payments, loans, expenses, invested] = await Promise.all([
    db.payment.aggregate({
      where: { receivedOn: { gte: from, lt: to } },
      _sum: { amountPaise: true },
      _count: true,
    }),
    db.loan.aggregate({
      where: { disbursedOn: { gte: from, lt: to } },
      _sum: { netDisbursedPaise: true },
      _count: true,
    }),
    db.expense.aggregate({
      where: { date: { gte: from, lt: to } },
      _sum: { amountPaise: true },
    }),
    db.investorTxn.aggregate({
      where: { date: { gte: from, lt: to }, type: "INVESTMENT" },
      _sum: { amountPaise: true },
    }),
  ]);

  return {
    collectedPaise: payments._sum.amountPaise ?? 0,
    paymentCount: payments._count,
    disbursedPaise: loans._sum.netDisbursedPaise ?? 0,
    loanCount: loans._count,
    expensesPaise: expenses._sum.amountPaise ?? 0,
    investedPaise: invested._sum.amountPaise ?? 0,
  };
}

export type TrendPoint = { label: string; collected: number; disbursed: number; expenses: number };

/** Last `months` calendar months, oldest first — feeds the dashboard chart. */
export async function monthlyTrend(months = 6, ref = new Date()): Promise<TrendPoint[]> {
  const points: TrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const from = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    const totals = await periodTotals(from, to);
    points.push({
      label: from.toLocaleDateString("en-IN", { month: "short" }),
      collected: totals.collectedPaise / 100,
      disbursed: totals.disbursedPaise / 100,
      expenses: totals.expensesPaise / 100,
    });
  }
  return points;
}

export type CustomerReportRow = {
  id: string;
  code: string;
  name: string;
  phone: string;
  loans: number;
  disbursedPaise: number;
  collectedPaise: number;
  outstandingPaise: number;
  overduePaise: number;
};

export async function customerReport(today = new Date()): Promise<CustomerReportRow[]> {
  const customers = await db.customer.findMany({
    include: {
      loans: {
        include: {
          installments: { select: { dueDate: true, totalPaise: true, paidPaise: true, status: true } },
          payments: { select: { amountPaise: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((c) => {
    let disbursed = 0;
    let collected = 0;
    let outstanding = 0;
    let overdue = 0;

    for (const loan of c.loans) {
      disbursed += loan.netDisbursedPaise;
      collected += loan.payments.reduce((a, p) => a + p.amountPaise, 0);
      for (const inst of loan.installments) {
        const owed = Math.max(0, inst.totalPaise - inst.paidPaise);
        outstanding += owed;
        if (isOverdue(inst, today)) overdue += owed;
      }
    }

    return {
      id: c.id,
      code: c.code,
      name: c.name,
      phone: c.phone,
      loans: c.loans.length,
      disbursedPaise: disbursed,
      collectedPaise: collected,
      outstandingPaise: outstanding,
      overduePaise: overdue,
    };
  });
}

export type InvestorReportRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  interestRatePct: number;
  investedPaise: number;
  withdrawnPaise: number;
  payoutPaise: number;
  netPaise: number;
};

export async function investorReport(): Promise<InvestorReportRow[]> {
  const investors = await db.investor.findMany({
    include: { transactions: true },
    orderBy: { name: "asc" },
  });

  return investors.map((inv) => {
    const total = (type: string) =>
      inv.transactions.filter((t) => t.type === type).reduce((a, t) => a + t.amountPaise, 0);
    const investedPaise = total("INVESTMENT");
    const withdrawnPaise = total("WITHDRAWAL");
    const payoutPaise = total("INTEREST_PAYOUT");
    return {
      id: inv.id,
      code: inv.code,
      name: inv.name,
      type: inv.type,
      interestRatePct: inv.interestRatePct,
      investedPaise,
      withdrawnPaise,
      payoutPaise,
      netPaise: investedPaise - withdrawnPaise,
    };
  });
}

export async function expenseBreakdown(from: Date, to: Date) {
  const rows = await db.expense.groupBy({
    by: ["category"],
    where: { date: { gte: from, lt: to } },
    _sum: { amountPaise: true },
    _count: true,
  });
  return rows.map((r) => ({
    category: r.category,
    amountPaise: r._sum.amountPaise ?? 0,
    count: r._count,
  }));
}

/** Everything due or missed, oldest first — the collection worklist. */
export async function collectionQueue(today = new Date(), horizonDays = 7) {
  const limit = addDays(startOfDay(today), horizonDays);
  const installments = await db.installment.findMany({
    where: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lt: limit } },
    include: { loan: { include: { customer: true } } },
    orderBy: { dueDate: "asc" },
    take: 200,
  });
  return installments.map((i) => ({
    ...i,
    overdue: isOverdue(i, today),
    owedPaise: i.totalPaise - i.paidPaise,
  }));
}

import type { Metadata } from "next";
import Link from "next/link";

import { FilterTabs } from "@/components/filter-tabs";
import { PrintButton } from "@/components/print-button";
import { StatTile } from "@/components/stat-tile";
import { InvestorTypeBadge } from "@/components/status-badges";
import {
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { formatDate } from "@/lib/dates";
import { EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from "@/lib/enums";
import { formatMoney } from "@/lib/money";
import {
  customerReport,
  expenseBreakdown,
  investorReport,
  periodRange,
  periodTotals,
  portfolioSummary,
  type Period,
} from "@/lib/reports";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Reports" };

const PERIODS: Array<[Period, string]> = [
  ["week", "This week"],
  ["month", "This month"],
  ["year", "This year"],
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireAdmin();
  const { period: rawPeriod } = await searchParams;
  const period: Period = rawPeriod === "week" || rawPeriod === "year" ? rawPeriod : "month";

  const { from, to } = periodRange(period);
  const [totals, summary, customers, investors, expenses] = await Promise.all([
    periodTotals(from, to),
    portfolioSummary(),
    customerReport(),
    investorReport(),
    expenseBreakdown(from, to),
  ]);

  const expenseTotal = expenses.reduce((a, e) => a + e.amountPaise, 0);
  const netFlow = totals.collectedPaise - totals.disbursedPaise - totals.expensesPaise;
  const withOutstanding = customers.filter((c) => c.outstandingPaise > 0 || c.loans > 0);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${formatDate(from)} — ${formatDate(new Date(to.getTime() - 86_400_000))}`}
        actions={
          <>
            <FilterTabs
              basePath="/reports"
              param="period"
              value={period}
              variant="bordered"
              options={PERIODS.map(([value, label]) => ({ value, label }))}
            />
            <LinkButton href={`/api/export?report=customers`}>Export CSV</LinkButton>
            <PrintButton />
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Collected"
          value={formatMoney(totals.collectedPaise)}
          hint={`${totals.paymentCount} receipt${totals.paymentCount === 1 ? "" : "s"}`}
          tone="money"
        />
        <StatTile
          label="Disbursed"
          value={formatMoney(totals.disbursedPaise)}
          hint={`${totals.loanCount} loan${totals.loanCount === 1 ? "" : "s"}`}
          tone="brand"
        />
        <StatTile label="Expenses" value={formatMoney(totals.expensesPaise)} tone="warn" />
        <StatTile
          label="Net cash flow"
          value={formatMoney(netFlow)}
          hint="Collected − disbursed − expenses"
          tone={netFlow >= 0 ? "money" : "risk"}
        />
      </section>

      <Card className="mt-4">
        <CardHeader title="Position as of today" subtitle="Whole book, not just this period" />
        <dl className="grid divide-y sm:grid-cols-2 sm:divide-y-0">
          {[
            ["Active loans", String(summary.activeLoans)],
            ["Customers", String(summary.customers)],
            ["Principal deployed", formatMoney(summary.principalOutPaise)],
            ["Outstanding receivable", formatMoney(summary.outstandingPaise)],
            ["Of which overdue", formatMoney(summary.overduePaise)],
            ["Investor capital held", formatMoney(summary.investorCapitalPaise - summary.investorWithdrawnPaise)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 border-b px-5 py-3">
              <dt className="text-sm" style={{ color: "var(--text-muted)" }}>
                {label}
              </dt>
              <dd className="text-base font-semibold tnum">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Customer-wise report"
          subtitle={`${withOutstanding.length} customer${withOutstanding.length === 1 ? "" : "s"} with lending history`}
          action={<LinkButton href="/api/export?report=customers" size="sm">CSV</LinkButton>}
        />
        {withOutstanding.length === 0 ? (
          <EmptyState title="No lending yet" description="Disburse a loan to populate this report." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th align="center">Loans</Th>
                <Th align="right">Disbursed</Th>
                <Th align="right">Collected</Th>
                <Th align="right">Outstanding</Th>
                <Th align="right">Overdue</Th>
              </tr>
            </thead>
            <tbody>
              {withOutstanding.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <span className="ml-2 text-xs" style={{ color: "var(--text-faint)" }}>
                      {c.code}
                    </span>
                  </Td>
                  <Td align="center">{c.loans}</Td>
                  <Td align="right">{formatMoney(c.disbursedPaise)}</Td>
                  <Td align="right" className="text-ontone-money">{formatMoney(c.collectedPaise)}</Td>
                  <Td align="right" className="font-medium">{formatMoney(c.outstandingPaise)}</Td>
                  <Td align="right" className={c.overduePaise ? "font-semibold text-ontone-risk" : undefined}>
                    {c.overduePaise ? formatMoney(c.overduePaise) : "—"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Investor report"
            action={<LinkButton href="/api/export?report=investors" size="sm">CSV</LinkButton>}
          />
          {investors.length === 0 ? (
            <EmptyState title="No investors" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Investor</Th>
                  <Th>Type</Th>
                  <Th align="right">Invested</Th>
                  <Th align="right">Net held</Th>
                </tr>
              </thead>
              <tbody>
                {investors.map((i) => (
                  <Tr key={i.id}>
                    <Td>
                      <Link href={`/investors/${i.id}`} className="font-medium hover:underline">
                        {i.name}
                      </Link>
                    </Td>
                    <Td><InvestorTypeBadge type={i.type} /></Td>
                    <Td align="right">{formatMoney(i.investedPaise)}</Td>
                    <Td align="right" className="font-semibold">{formatMoney(i.netPaise)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Expenses this period"
            subtitle={formatMoney(expenseTotal)}
            action={<LinkButton href="/api/export?report=expenses" size="sm">CSV</LinkButton>}
          />
          {expenses.length === 0 ? (
            <EmptyState title="No expenses in this period" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Category</Th>
                  <Th align="center">Entries</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Share</Th>
                </tr>
              </thead>
              <tbody>
                {[...expenses]
                  .sort((a, b) => b.amountPaise - a.amountPaise)
                  .map((e) => (
                    <Tr key={e.category}>
                      <Td>{EXPENSE_CATEGORY_LABEL[e.category as ExpenseCategory] ?? e.category}</Td>
                      <Td align="center">{e.count}</Td>
                      <Td align="right" className="font-medium">{formatMoney(e.amountPaise)}</Td>
                      <Td align="right">
                        {expenseTotal ? `${Math.round((e.amountPaise / expenseTotal) * 100)}%` : "—"}
                      </Td>
                    </Tr>
                  ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

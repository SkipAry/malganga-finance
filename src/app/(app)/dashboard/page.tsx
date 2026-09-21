import type { Metadata } from "next";
import Link from "next/link";

import { StatTile } from "@/components/stat-tile";
import { InstallmentStatusBadge, ModeBadge } from "@/components/status-badges";
import { TrendChartLazy } from "@/components/trend-chart-lazy";
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
import { db } from "@/lib/db";
import { dueLabel, formatDate } from "@/lib/dates";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { collectionQueue, monthlyTrend, portfolioSummary, type TrendPoint } from "@/lib/reports";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * One plain sentence saying what the chart shows, so the takeaway does not
 * depend on reading three overlapping lines (and so the chart has a text
 * equivalent for screen readers).
 */
function trendSummary(trend: TrendPoint[]): string {
  if (trend.length < 2) return "Not enough history yet to show a trend.";

  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const net = last.collected - last.disbursed - last.expenses;
  const rupees = (v: number) => formatMoneyCompact(Math.round(v * 100));

  const movement =
    last.collected > prev.collected
      ? `up from ${rupees(prev.collected)} in ${prev.label}`
      : last.collected < prev.collected
        ? `down from ${rupees(prev.collected)} in ${prev.label}`
        : `level with ${prev.label}`;

  return `${last.label}: ${rupees(last.collected)} collected (${movement}), ${rupees(
    last.disbursed,
  )} lent out and ${rupees(last.expenses)} of costs — a net ${
    net >= 0 ? "inflow" : "outflow"
  } of ${rupees(Math.abs(net))}.`;
}

export default async function DashboardPage() {
  const user = await requireStaff();
  const today = new Date();

  const [summary, trend, queue, recentPayments] = await Promise.all([
    portfolioSummary(today),
    monthlyTrend(6, today),
    collectionQueue(today, 7),
    db.payment.findMany({
      take: 6,
      orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
      include: { loan: { include: { customer: { select: { name: true } } } } },
    }),
  ]);

  const overdueRows = queue.filter((q) => q.overdue);
  const upcomingRows = queue.length - overdueRows.length;

  return (
    <>
      <PageHeader
        title={`Good ${greeting()}, ${user.name.split(" ")[0]}`}
        subtitle={`Position as on ${formatDate(today)}`}
        actions={
          <>
            <LinkButton href="/payments/new">Record payment</LinkButton>
            <LinkButton href="/loans/new" variant="primary">
              New loan
            </LinkButton>
          </>
        }
      />

      <section aria-labelledby="key-figures">
        <h2 id="key-figures" className="sr-only">
          Key figures
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Outstanding"
            value={formatMoneyCompact(summary.outstandingPaise)}
            status={`${summary.activeLoans} active loan${summary.activeLoans === 1 ? "" : "s"}`}
            hint="Still to be collected across the whole book"
            tone="brand"
            href="/loans"
          />
          <StatTile
            label="Overdue"
            value={formatMoneyCompact(summary.overduePaise)}
            status={
              summary.overdueCount
                ? `${summary.overdueCount} EMI${summary.overdueCount === 1 ? "" : "s"} need chasing`
                : "Nothing past due"
            }
            hint={summary.overdueCount ? "Past the due date and unpaid" : "Every EMI is on schedule"}
            tone={summary.overduePaise > 0 ? "risk" : "money"}
            href="/collections"
          />
          <StatTile
            label="Due this week"
            value={formatMoneyCompact(summary.dueThisWeekPaise)}
            status={`${upcomingRows} EMI${upcomingRows === 1 ? "" : "s"} coming up`}
            hint="Falls due within the next 7 days"
            tone="warn"
            href="/collections"
          />
          <StatTile
            label="Cash position"
            value={formatMoneyCompact(summary.cashInHandPaise)}
            status={summary.cashInHandPaise >= 0 ? "In surplus" : "Overdrawn"}
            hint="Investor funds held, after lending, payouts and costs"
            tone={summary.cashInHandPaise >= 0 ? "money" : "risk"}
          />
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Cash movement" subtitle={trendSummary(trend)} />
          <TrendChartLazy data={trend} />
        </Card>

        <Card>
          <CardHeader title="Book summary" subtitle="Whole business, to date" />
          <dl className="divide-y">
            {[
              ["Customers", String(summary.customers), false],
              ["Principal deployed", formatMoney(summary.principalOutPaise), false],
              ["Total collected", formatMoney(summary.collectedPaise), true],
              ["Investor capital", formatMoney(summary.investorCapitalPaise), false],
              ["Paid back to investors", formatMoney(summary.investorWithdrawnPaise), false],
              ["Expenses to date", formatMoney(summary.expensesPaise), false],
            ].map(([label, value, emphasis]) => (
              <div key={label as string} className="flex items-baseline justify-between gap-4 px-5 py-3">
                <dt className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {label}
                </dt>
                <dd
                  className="text-base font-semibold tnum"
                  style={emphasis ? { color: "var(--tone-money)" } : undefined}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Needs collection"
            subtitle={
              overdueRows.length
                ? `${overdueRows.length} overdue, ${upcomingRows} due within 7 days`
                : `${upcomingRows} due within 7 days, nothing overdue`
            }
            action={
              <LinkButton href="/collections" size="sm">
                View all
              </LinkButton>
            }
          />
          {queue.length === 0 ? (
            <EmptyState title="Nothing to chase" description="No EMI is overdue or due this week." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Due</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Status</Th>
                  <Th><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, 6).map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link href={`/loans/${row.loanId}`} className="font-medium hover:underline">
                        {row.loan.customer.name}
                      </Link>
                      <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                        {row.loan.code} · EMI {row.seq}
                      </span>
                    </Td>
                    <Td>
                      <span className="block">{formatDate(row.dueDate)}</span>
                      <span
                        className="text-xs"
                        style={{ color: row.overdue ? "var(--tone-risk)" : "var(--text-faint)" }}
                      >
                        {dueLabel(row.dueDate, today)}
                      </span>
                    </Td>
                    <Td align="right" className="font-semibold">
                      {formatMoney(row.owedPaise)}
                    </Td>
                    <Td align="right">
                      <InstallmentStatusBadge status={row.status} overdue={row.overdue} />
                    </Td>
                    <Td align="right">
                      <LinkButton href={`/payments/new?loanId=${row.loanId}`} size="sm">
                        Collect
                      </LinkButton>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent receipts"
            subtitle="Last six payments entered"
            action={
              <LinkButton href="/payments" size="sm">
                View all
              </LinkButton>
            }
          />
          {recentPayments.length === 0 ? (
            <EmptyState
              title="No receipts yet"
              description="Payments recorded by staff will appear here."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Received</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Mode</Th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <Link href={`/loans/${p.loanId}`} className="font-medium hover:underline">
                        {p.loan.customer.name}
                      </Link>
                      <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                        {p.loan.code}
                      </span>
                    </Td>
                    <Td>{formatDate(p.receivedOn)}</Td>
                    <Td align="right" className="font-semibold text-ontone-money">
                      {formatMoney(p.amountPaise)}
                    </Td>
                    <Td align="right">
                      <ModeBadge mode={p.mode} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </section>
    </>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

import type { Metadata } from "next";
import Link from "next/link";

import { StatTile } from "@/components/stat-tile";
import { InstallmentStatusBadge, ModeBadge } from "@/components/status-badges";
import { TrendChart } from "@/components/trend-chart";
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
import { collectionQueue, monthlyTrend, portfolioSummary } from "@/lib/reports";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Outstanding"
          value={formatMoneyCompact(summary.outstandingPaise)}
          hint={`${summary.activeLoans} active loan${summary.activeLoans === 1 ? "" : "s"}`}
          tone="brand"
          href="/loans"
        />
        <StatTile
          label="Overdue"
          value={formatMoneyCompact(summary.overduePaise)}
          hint={
            summary.overdueCount
              ? `${summary.overdueCount} EMI${summary.overdueCount === 1 ? "" : "s"} past due`
              : "Nothing past due"
          }
          tone={summary.overduePaise > 0 ? "risk" : "money"}
          href="/collections"
        />
        <StatTile
          label="Due this week"
          value={formatMoneyCompact(summary.dueThisWeekPaise)}
          hint="Falling due in the next 7 days"
          tone="warn"
          href="/collections"
        />
        <StatTile
          label="Cash in hand"
          value={formatMoneyCompact(summary.cashInHandPaise)}
          hint="Capital + collections − payouts − lending − costs"
          tone={summary.cashInHandPaise >= 0 ? "money" : "risk"}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Cash movement"
            subtitle="Collections, disbursements and expenses over the last 6 months"
          />
          <TrendChart data={trend} />
        </Card>

        <Card>
          <CardHeader title="Book summary" />
          <dl className="divide-y">
            {[
              ["Customers", String(summary.customers)],
              ["Principal deployed", formatMoney(summary.principalOutPaise)],
              ["Total collected", formatMoney(summary.collectedPaise)],
              ["Investor capital", formatMoney(summary.investorCapitalPaise)],
              ["Paid back to investors", formatMoney(summary.investorWithdrawnPaise)],
              ["Expenses to date", formatMoney(summary.expensesPaise)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-3">
                <dt className="text-[13.5px]" style={{ color: "var(--text-muted)" }}>
                  {label}
                </dt>
                <dd className="text-[14px] font-semibold tnum">{value}</dd>
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
                ? `${overdueRows.length} overdue, ${queue.length - overdueRows.length} due soon`
                : "Due in the next 7 days"
            }
            action={<LinkButton href="/collections" size="sm">View all</LinkButton>}
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
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, 7).map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link href={`/loans/${row.loanId}`} className="font-medium hover:underline">
                        {row.loan.customer.name}
                      </Link>
                      <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {row.loan.code} · EMI {row.seq}
                      </span>
                    </Td>
                    <Td>
                      <span className="block">{formatDate(row.dueDate)}</span>
                      <span
                        className="text-[12px]"
                        style={{ color: row.overdue ? "var(--color-risk-500)" : "var(--text-faint)" }}
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
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent receipts"
            action={<LinkButton href="/payments" size="sm">View all</LinkButton>}
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
                      <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {p.loan.code}
                      </span>
                    </Td>
                    <Td>{formatDate(p.receivedOn)}</Td>
                    <Td align="right" className="font-semibold text-money-600">
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

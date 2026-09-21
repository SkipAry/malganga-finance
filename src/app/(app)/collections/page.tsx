import type { Metadata } from "next";
import Link from "next/link";

import { StatTile } from "@/components/stat-tile";
import { InstallmentStatusBadge } from "@/components/status-badges";
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
import { dueLabel, formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { collectionQueue } from "@/lib/reports";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireStaff();
  const { days = "7" } = await searchParams;
  const horizon = Number.isFinite(Number(days)) ? Math.max(0, Math.min(90, Number(days))) : 7;

  const today = new Date();
  const queue = await collectionQueue(today, horizon);

  const overdue = queue.filter((q) => q.overdue);
  const upcoming = queue.filter((q) => !q.overdue);
  const overdueTotal = overdue.reduce((a, q) => a + q.owedPaise, 0);
  const upcomingTotal = upcoming.reduce((a, q) => a + q.owedPaise, 0);

  return (
    <>
      <PageHeader
        title="Collections"
        subtitle="Everything overdue, plus what falls due next — worked oldest first."
        actions={
          <div className="flex gap-1">
            {[
              ["0", "Overdue only"],
              ["7", "7 days"],
              ["30", "30 days"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={`/collections?days=${value}`}
                className="rounded-lg border px-3 py-1.5 text-[13px] transition-colors"
                style={
                  String(horizon) === value
                    ? { background: "var(--bg-sunken)", fontWeight: 500 }
                    : { color: "var(--text-muted)" }
                }
              >
                {label}
              </Link>
            ))}
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Overdue"
          value={formatMoney(overdueTotal)}
          hint={`${overdue.length} EMI${overdue.length === 1 ? "" : "s"}`}
          tone={overdueTotal > 0 ? "risk" : "money"}
        />
        <StatTile
          label={`Due in ${horizon} days`}
          value={formatMoney(upcomingTotal)}
          hint={`${upcoming.length} EMI${upcoming.length === 1 ? "" : "s"}`}
          tone="warn"
        />
        <StatTile label="Total to collect" value={formatMoney(overdueTotal + upcomingTotal)} tone="brand" />
      </section>

      <Card className="mt-4">
        <CardHeader
          title="Worklist"
          subtitle={`${queue.length} installment${queue.length === 1 ? "" : "s"}`}
        />
        {queue.length === 0 ? (
          <EmptyState title="All clear" description="Nothing is overdue and nothing falls due in this window." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Contact</Th>
                <Th>Loan</Th>
                <Th>Due</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <Link href={`/customers/${row.loan.customerId}`} className="font-medium hover:underline">
                      {row.loan.customer.name}
                    </Link>
                  </Td>
                  <Td>
                    <a href={`tel:${row.loan.customer.phone}`} className="hover:underline">
                      {row.loan.customer.phone}
                    </a>
                  </Td>
                  <Td>
                    <Link href={`/loans/${row.loanId}`} className="hover:underline">
                      {row.loan.code}
                    </Link>
                    <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                      EMI {row.seq}
                    </span>
                  </Td>
                  <Td>
                    {formatDate(row.dueDate)}
                    <span
                      className="block text-[12px]"
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
    </>
  );
}

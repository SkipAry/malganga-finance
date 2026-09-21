import type { Metadata } from "next";
import Link from "next/link";

import { StatTile } from "@/components/stat-tile";
import { InvestorTypeBadge } from "@/components/status-badges";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { investorReport } from "@/lib/reports";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Investors" };

export default async function InvestorsPage() {
  await requireAdmin();

  const [rows, actives] = await Promise.all([
    investorReport(),
    db.investor.findMany({ select: { id: true, isActive: true } }),
  ]);
  const activeMap = new Map(actives.map((a) => [a.id, a.isActive]));

  const totalIn = rows.reduce((a, r) => a + r.investedPaise, 0);
  const totalOut = rows.reduce((a, r) => a + r.withdrawnPaise, 0);
  const totalPayouts = rows.reduce((a, r) => a + r.payoutPaise, 0);

  return (
    <>
      <PageHeader
        title="Investors"
        subtitle="Capital funding the lending book"
        actions={
          <LinkButton href="/investors/new" variant="primary">
            Add investor
          </LinkButton>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Capital raised" value={formatMoney(totalIn)} tone="brand" />
        <StatTile label="Withdrawn" value={formatMoney(totalOut)} tone="warn" />
        <StatTile label="Interest paid out" value={formatMoney(totalPayouts)} tone="neutral" />
        <StatTile label="Capital held" value={formatMoney(totalIn - totalOut)} tone="money" />
      </section>

      <Card className="mt-4">
        {rows.length === 0 ? (
          <EmptyState
            title="No investors yet"
            description="Register the people funding the business."
            action={<LinkButton href="/investors/new" variant="primary">Add investor</LinkButton>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Investor</Th>
                <Th>Category</Th>
                <Th align="right">Rate</Th>
                <Th align="right">Invested</Th>
                <Th align="right">Withdrawn</Th>
                <Th align="right">Interest paid</Th>
                <Th align="right">Net held</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/investors/${r.id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    <span className="ml-2 text-xs" style={{ color: "var(--text-faint)" }}>
                      {r.code}
                    </span>
                    {activeMap.get(r.id) === false ? <Badge className="ml-2">Inactive</Badge> : null}
                  </Td>
                  <Td><InvestorTypeBadge type={r.type} /></Td>
                  <Td align="right">{r.interestRatePct}% / mo</Td>
                  <Td align="right">{formatMoney(r.investedPaise)}</Td>
                  <Td align="right">{r.withdrawnPaise ? formatMoney(r.withdrawnPaise) : "—"}</Td>
                  <Td align="right">{r.payoutPaise ? formatMoney(r.payoutPaise) : "—"}</Td>
                  <Td align="right" className="font-semibold">{formatMoney(r.netPaise)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

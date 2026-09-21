import type { Metadata } from "next";

import { StatTile } from "@/components/stat-tile";
import { InvestorTypeBadge, ModeBadge } from "@/components/status-badges";
import {
  Card,
  CardHeader,
  DescList,
  EmptyState,
  Note,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { INVESTOR_TXN_LABEL, type InvestorTxnType } from "@/lib/enums";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My portfolio" };

/**
 * Investor self-service view (scope 3.7). Read-only, and scoped by the
 * investorId baked into the session — an investor can never reach another
 * investor's records or any customer data.
 */
export default async function PortfolioPage() {
  const user = await requireUser();

  if (user.role !== "INVESTOR" || !user.investorId) {
    return (
      <>
        <PageHeader title="My portfolio" />
        <Card>
          <EmptyState
            title="No investor account linked"
            description="This view is for investor logins. Ask an administrator to link your account to an investor record."
          />
        </Card>
      </>
    );
  }

  const investor = await db.investor.findUnique({
    where: { id: user.investorId },
    include: { transactions: { orderBy: { date: "desc" } } },
  });

  if (!investor) {
    return (
      <>
        <PageHeader title="My portfolio" />
        <Card>
          <EmptyState title="Investor record not found" description="Please contact the office." />
        </Card>
      </>
    );
  }

  const total = (type: string) =>
    investor.transactions.filter((t) => t.type === type).reduce((a, t) => a + t.amountPaise, 0);

  const invested = total("INVESTMENT");
  const withdrawn = total("WITHDRAWAL");
  const payouts = total("INTEREST_PAYOUT");
  const held = invested - withdrawn;

  return (
    <>
      <PageHeader
        title={`Welcome, ${investor.name.split(" ")[0]}`}
        subtitle={
          <>
            {investor.code} · <InvestorTypeBadge type={investor.type} /> ·{" "}
            {investor.interestRatePct}% per month
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Capital with Malganga" value={formatMoney(held)} tone="money" />
        <StatTile label="Total invested" value={formatMoney(invested)} tone="brand" />
        <StatTile label="Withdrawn" value={formatMoney(withdrawn)} />
        <StatTile label="Interest received" value={formatMoney(payouts)} tone="money" />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Card>
          <CardHeader title="Statement" subtitle="Every movement on your account" />
          {investor.transactions.length === 0 ? (
            <EmptyState title="No transactions yet" description="Your investment history will appear here." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th align="right">Amount</Th>
                  <Th>Mode</Th>
                  <Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {investor.transactions.map((t) => (
                  <Tr key={t.id}>
                    <Td>{formatDate(t.date)}</Td>
                    <Td>{INVESTOR_TXN_LABEL[t.type as InvestorTxnType] ?? t.type}</Td>
                    <Td
                      align="right"
                      className="font-semibold"
                      style={{
                        color:
                          t.type === "INVESTMENT" ? "var(--tone-money)" : "var(--tone-warn)",
                      }}
                    >
                      {t.type === "INVESTMENT" ? "+" : "−"}
                      {formatMoney(t.amountPaise)}
                    </Td>
                    <Td><ModeBadge mode={t.mode} /></Td>
                    <Td className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      {t.note ?? "—"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Your details" />
            <div className="p-5">
              <DescList
                items={[
                  ["Name", investor.name],
                  ["Mobile", investor.phone],
                  ["Email", investor.email ?? "—"],
                  ["Category", investor.type === "INTERNAL" ? "Internal" : "External"],
                  ["Agreed rate", `${investor.interestRatePct}% per month`],
                  ["Investor since", formatDate(investor.createdAt)],
                ]}
              />
            </div>
          </Card>

          <Note tone="brand">
            This view is read-only. To add capital, withdraw, or update your details, please contact
            the Malganga Finance office.
          </Note>
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InvestorTxnForm } from "../investor-form";
import { removeInvestor, removeInvestorTxn } from "@/actions/investors";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { StatTile } from "@/components/stat-tile";
import { InvestorTypeBadge, ModeBadge } from "@/components/status-badges";
import {
  Badge,
  Card,
  CardHeader,
  DescList,
  EmptyState,
  LinkButton,
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
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const investor = await db.investor.findUnique({ where: { id }, select: { name: true } });
  return { title: investor?.name ?? "Investor" };
}

export default async function InvestorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const investor = await db.investor.findUnique({
    where: { id },
    include: { transactions: { orderBy: { date: "desc" } }, users: { select: { email: true } } },
  });
  if (!investor) notFound();

  const total = (type: string) =>
    investor.transactions.filter((t) => t.type === type).reduce((a, t) => a + t.amountPaise, 0);

  const invested = total("INVESTMENT");
  const withdrawn = total("WITHDRAWAL");
  const payouts = total("INTEREST_PAYOUT");
  const held = invested - withdrawn;

  return (
    <>
      <PageHeader
        title={investor.name}
        subtitle={
          <>
            {investor.code} · <InvestorTypeBadge type={investor.type} />
            {!investor.isActive ? <Badge className="ml-2">Inactive</Badge> : null}
          </>
        }
        actions={
          <>
            <LinkButton href={`/investors/${investor.id}/edit`}>Edit</LinkButton>
            <form action={removeInvestor}>
              <input type="hidden" name="id" value={investor.id} />
              <ConfirmSubmit
                variant="danger"
                confirm={
                  investor.transactions.length
                    ? `${investor.name} has ${investor.transactions.length} transaction(s) and will be deactivated, not deleted. Continue?`
                    : `Permanently delete ${investor.name}?`
                }
              >
                {investor.transactions.length ? "Deactivate" : "Delete"}
              </ConfirmSubmit>
            </form>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total invested" value={formatMoney(invested)} tone="brand" />
        <StatTile label="Withdrawn" value={formatMoney(withdrawn)} tone="warn" />
        <StatTile label="Interest paid out" value={formatMoney(payouts)} />
        <StatTile label="Capital held" value={formatMoney(held)} tone="money" />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Card>
          <CardHeader
            title="Transactions"
            subtitle={`${investor.transactions.length} entr${investor.transactions.length === 1 ? "y" : "ies"}`}
          />
          {investor.transactions.length === 0 ? (
            <EmptyState title="No transactions" description="Record the first investment." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th align="right">Amount</Th>
                  <Th>Mode</Th>
                  <Th>Note</Th>
                  <Th />
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
                    <Td align="right">
                      <form action={removeInvestorTxn}>
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmSubmit size="sm" variant="ghost" confirm="Delete this transaction?">
                          Delete
                        </ConfirmSubmit>
                      </form>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Record a transaction" />
            <InvestorTxnForm investorId={investor.id} />
          </Card>

          <Card>
            <CardHeader title="Profile" />
            <div className="p-5">
              <DescList
                items={[
                  ["Mobile", investor.phone],
                  ["Email", investor.email ?? "—"],
                  ["Category", investor.type === "INTERNAL" ? "Internal" : "External"],
                  ["Agreed rate", `${investor.interestRatePct}% per month`],
                  ["Address", investor.address ?? "—"],
                  ["Portal login", investor.users[0]?.email ?? "Not linked"],
                  ["Registered", formatDate(investor.createdAt)],
                ]}
              />
            </div>
          </Card>

          <Note tone="brand" title="Fund tracing">
            Capital is pooled across the book. Tracing each investor&apos;s money to specific loans
            (scope section 5, item 6) is not built — confirm whether it is required.
          </Note>
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { deletePayment } from "@/actions/loans";
import { FilterTabs } from "@/components/filter-tabs";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SearchBar } from "@/components/search-bar";
import { StatTile } from "@/components/stat-tile";
import { ModeBadge } from "@/components/status-badges";
import {
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
import { formatDate, startOfMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getSessionUser, requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  await requireStaff();
  const session = await getSessionUser();
  const isAdmin = session?.role === "ADMIN";
  const { q = "", mode = "all" } = await searchParams;

  const monthStart = startOfMonth(new Date());

  const [payments, monthAgg, cashAgg] = await Promise.all([
    db.payment.findMany({
      where: {
        ...(mode === "all" ? {} : { mode }),
        ...(q
          ? {
              OR: [
                { loan: { code: { contains: q } } },
                { loan: { customer: { name: { contains: q } } } },
                { reference: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        loan: { include: { customer: { select: { id: true, name: true } } } },
        recordedBy: { select: { name: true } },
        installment: { select: { seq: true } },
      },
      orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.payment.aggregate({
      where: { receivedOn: { gte: monthStart } },
      _sum: { amountPaise: true },
      _count: true,
    }),
    db.payment.groupBy({
      by: ["mode"],
      where: { receivedOn: { gte: monthStart } },
      _sum: { amountPaise: true },
    }),
  ]);

  const cash = cashAgg.find((c) => c.mode === "CASH")?._sum.amountPaise ?? 0;
  const online = cashAgg.find((c) => c.mode === "ONLINE")?._sum.amountPaise ?? 0;

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Every receipt is entered by hand — there is no bank or gateway feed."
        actions={
          <LinkButton href="/payments/new" variant="primary">
            Record payment
          </LinkButton>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Collected this month"
          value={formatMoney(monthAgg._sum.amountPaise ?? 0)}
          hint={`${monthAgg._count} receipt${monthAgg._count === 1 ? "" : "s"}`}
          tone="money"
        />
        <StatTile label="In cash" value={formatMoney(cash)} tone="warn" />
        <StatTile label="Online" value={formatMoney(online)} tone="brand" />
      </section>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <SearchBar placeholder="Search customer, loan code or reference…" />
          <FilterTabs
            basePath="/payments"
            param="mode"
            value={mode}
            searchParams={{ q }}
            options={[
              { value: "all", label: "All" },
              { value: "CASH", label: "Cash" },
              { value: "ONLINE", label: "Online" },
            ]}
          />
        </div>

        {payments.length === 0 ? (
          <EmptyState
            title={q ? "No matching receipts" : "No payments recorded"}
            description={q ? "Try another search." : "Record a collection to see it here."}
            action={!q ? <LinkButton href="/payments/new" variant="primary">Record payment</LinkButton> : null}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Received</Th>
                <Th>Customer</Th>
                <Th>Loan</Th>
                <Th align="right">Amount</Th>
                <Th>Mode</Th>
                <Th>Reference</Th>
                <Th>Recorded by</Th>
                {isAdmin ? <Th><span className="sr-only">Actions</span></Th> : null}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <Tr key={p.id}>
                  <Td>{formatDate(p.receivedOn)}</Td>
                  <Td>
                    <Link href={`/customers/${p.loan.customerId}`} className="font-medium hover:underline">
                      {p.loan.customer.name}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/loans/${p.loanId}`} className="hover:underline">
                      {p.loan.code}
                    </Link>
                    {p.installment ? (
                      <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                        EMI {p.installment.seq}
                      </span>
                    ) : null}
                  </Td>
                  <Td align="right" className="font-semibold text-ontone-money">
                    {formatMoney(p.amountPaise)}
                  </Td>
                  <Td><ModeBadge mode={p.mode} /></Td>
                  <Td className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                    {p.reference ?? "—"}
                  </Td>
                  <Td className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                    {p.recordedBy?.name ?? "—"}
                  </Td>
                  {isAdmin ? (
                    <Td align="right">
                      <form action={deletePayment}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="loanId" value={p.loanId} />
                        <ConfirmSubmit
                          size="sm"
                          variant="ghost"
                          confirm={`Reverse this receipt of ${formatMoney(p.amountPaise)}?`}
                        >
                          Reverse
                        </ConfirmSubmit>
                      </form>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

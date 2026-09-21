import type { Metadata } from "next";
import Link from "next/link";

import { SearchBar } from "@/components/search-bar";
import { LoanStatusBadge } from "@/components/status-badges";
import {
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Progress,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { isOverdue } from "@/lib/loan-service";
import { formatMoney, pct } from "@/lib/money";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Loans" };

const TABS = [
  ["ACTIVE", "Active"],
  ["CLOSED", "Closed"],
  ["DEFAULTED", "Defaulted"],
  ["all", "All"],
] as const;

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireStaff();
  const { q = "", status = "ACTIVE" } = await searchParams;

  const loans = await db.loan.findMany({
    where: {
      ...(status === "all" ? {} : { status }),
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { customer: { name: { contains: q } } },
              { customer: { phone: { contains: q } } },
            ],
          }
        : {}),
    },
    include: {
      customer: { select: { id: true, name: true, code: true } },
      installments: { select: { dueDate: true, totalPaise: true, paidPaise: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const today = new Date();

  return (
    <>
      <PageHeader
        title="Loans"
        subtitle={`${loans.length} loan${loans.length === 1 ? "" : "s"}`}
        actions={
          <LinkButton href="/loans/new" variant="primary">
            New loan
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <SearchBar placeholder="Search loan code, customer or phone…" />
          <div className="flex gap-1">
            {TABS.map(([value, label]) => (
              <Link
                key={value}
                href={`/loans?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="rounded-lg px-3 py-1.5 text-[13px] transition-colors"
                style={
                  status === value
                    ? { background: "var(--bg-sunken)", fontWeight: 500 }
                    : { color: "var(--text-muted)" }
                }
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {loans.length === 0 ? (
          <EmptyState
            title={q ? "No matching loans" : "No loans here"}
            description={q ? "Try another search." : "Disburse a loan to see it listed."}
            action={!q ? <LinkButton href="/loans/new" variant="primary">New loan</LinkButton> : null}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Loan</Th>
                <Th>Customer</Th>
                <Th>Terms</Th>
                <Th align="right">Disbursed</Th>
                <Th align="right">Outstanding</Th>
                <Th>Repayment</Th>
                <Th align="right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => {
                const total = loan.installments.reduce((a, i) => a + i.totalPaise, 0);
                const paid = loan.installments.reduce((a, i) => a + i.paidPaise, 0);
                const owed = total - paid;
                const overdue = loan.installments.some((i) => isOverdue(i, today));

                return (
                  <Tr key={loan.id}>
                    <Td>
                      <Link href={`/loans/${loan.id}`} className="font-medium hover:underline">
                        {loan.code}
                      </Link>
                      <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {formatDate(loan.disbursedOn)}
                      </span>
                    </Td>
                    <Td>
                      <Link href={`/customers/${loan.customerId}`} className="hover:underline">
                        {loan.customer.name}
                      </Link>
                    </Td>
                    <Td>
                      <span className="text-[13px]">
                        {loan.tenure} × {loan.frequency === "WEEKLY" ? "weekly" : "monthly"}
                      </span>
                      <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {loan.interestRatePct}% / month
                      </span>
                    </Td>
                    <Td align="right">{formatMoney(loan.netDisbursedPaise)}</Td>
                    <Td align="right" className={overdue && owed > 0 ? "font-semibold text-risk-500" : "font-medium"}>
                      {formatMoney(owed)}
                    </Td>
                    <Td>
                      <div className="w-28">
                        <Progress value={pct(paid, total)} tone={overdue ? "risk" : "money"} />
                        <span className="mt-1 block text-[11.5px] tnum" style={{ color: "var(--text-faint)" }}>
                          {Math.round(pct(paid, total))}% repaid
                        </span>
                      </div>
                    </Td>
                    <Td align="right">
                      <LoanStatusBadge status={loan.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

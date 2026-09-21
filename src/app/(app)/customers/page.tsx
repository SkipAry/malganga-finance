import type { Metadata } from "next";
import Link from "next/link";

import { SearchBar } from "@/components/search-bar";
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
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { isOverdue } from "@/lib/loan-service";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireStaff();
  const { q = "", status = "active" } = await searchParams;

  const customers = await db.customer.findMany({
    where: {
      ...(status === "all" ? {} : { isActive: status !== "inactive" }),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { phone: { contains: q } },
              { code: { contains: q } },
              { shopName: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      loans: {
        select: {
          status: true,
          installments: {
            select: { dueDate: true, totalPaise: true, paidPaise: true, status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const today = new Date();

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} record${customers.length === 1 ? "" : "s"}`}
        actions={
          <LinkButton href="/customers/new" variant="primary">
            Add customer
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <SearchBar placeholder="Search name, phone, code or shop…" />
          <div className="flex gap-1">
            {[
              ["active", "Active"],
              ["inactive", "Inactive"],
              ["all", "All"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={`/customers?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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

        {customers.length === 0 ? (
          <EmptyState
            title={q ? "No matching customers" : "No customers yet"}
            description={
              q ? "Try a different name, phone number or code." : "Onboard your first borrower to get started."
            }
            action={!q ? <LinkButton href="/customers/new" variant="primary">Add customer</LinkButton> : null}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Contact</Th>
                <Th align="center">Loans</Th>
                <Th align="right">Outstanding</Th>
                <Th align="right">Overdue</Th>
                <Th>Onboarded</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                let outstanding = 0;
                let overdue = 0;
                let activeLoans = 0;
                for (const loan of c.loans) {
                  if (loan.status === "ACTIVE") activeLoans++;
                  for (const inst of loan.installments) {
                    const owed = Math.max(0, inst.totalPaise - inst.paidPaise);
                    outstanding += owed;
                    if (isOverdue(inst, today)) overdue += owed;
                  }
                }

                return (
                  <Tr key={c.id}>
                    <Td>
                      <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      <span className="ml-2 text-[12px]" style={{ color: "var(--text-faint)" }}>
                        {c.code}
                      </span>
                      {!c.isActive ? (
                        <Badge className="ml-2">Inactive</Badge>
                      ) : null}
                      {c.shopName ? (
                        <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                          {c.shopName}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <a href={`tel:${c.phone}`} className="hover:underline">
                        {c.phone}
                      </a>
                      {c.city ? (
                        <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                          {c.city}
                        </span>
                      ) : null}
                    </Td>
                    <Td align="center">
                      {c.loans.length}
                      {activeLoans ? (
                        <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                          {activeLoans} active
                        </span>
                      ) : null}
                    </Td>
                    <Td align="right">{outstanding ? formatMoney(outstanding) : "—"}</Td>
                    <Td align="right" className={overdue ? "font-semibold text-risk-500" : undefined}>
                      {overdue ? formatMoney(overdue) : "—"}
                    </Td>
                    <Td>{formatDate(c.createdAt)}</Td>
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

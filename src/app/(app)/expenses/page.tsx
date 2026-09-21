import type { Metadata } from "next";
import Link from "next/link";

import { ExpenseForm } from "./expense-form";
import { removeExpense } from "@/actions/operations";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { StatTile } from "@/components/stat-tile";
import { ModeBadge } from "@/components/status-badges";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Note,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDate, startOfMonth, startOfYear } from "@/lib/dates";
import { EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from "@/lib/enums";
import { formatMoney } from "@/lib/money";
import { expenseBreakdown } from "@/lib/reports";
import { getSessionUser, requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireStaff();
  const session = await getSessionUser();
  const isAdmin = session?.role === "ADMIN";
  const { category = "all" } = await searchParams;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const [expenses, monthAgg, yearAgg, breakdown] = await Promise.all([
    db.expense.findMany({
      where: category === "all" ? {} : { category },
      include: { recordedBy: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.expense.aggregate({ where: { date: { gte: monthStart } }, _sum: { amountPaise: true }, _count: true }),
    db.expense.aggregate({ where: { date: { gte: yearStart } }, _sum: { amountPaise: true } }),
    expenseBreakdown(monthStart, now),
  ]);

  return (
    <>
      <PageHeader title="Expenses" subtitle="Day-to-day running costs of the business" />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="This month"
          value={formatMoney(monthAgg._sum.amountPaise ?? 0)}
          hint={`${monthAgg._count} entr${monthAgg._count === 1 ? "y" : "ies"}`}
          tone="warn"
        />
        <StatTile label="This year" value={formatMoney(yearAgg._sum.amountPaise ?? 0)} />
        <StatTile
          label="Largest category"
          value={
            breakdown.length
              ? EXPENSE_CATEGORY_LABEL[
                  [...breakdown].sort((a, b) => b.amountPaise - a.amountPaise)[0]
                    .category as ExpenseCategory
                ]
              : "—"
          }
          hint="This month"
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Card>
          <div className="flex flex-wrap items-center gap-1 border-b p-4">
            <Link
              href="/expenses"
              className="rounded-lg px-3 py-1.5 text-[13px]"
              style={
                category === "all"
                  ? { background: "var(--bg-sunken)", fontWeight: 500 }
                  : { color: "var(--text-muted)" }
              }
            >
              All
            </Link>
            {(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((c) => (
              <Link
                key={c}
                href={`/expenses?category=${c}`}
                className="rounded-lg px-3 py-1.5 text-[13px]"
                style={
                  category === c
                    ? { background: "var(--bg-sunken)", fontWeight: 500 }
                    : { color: "var(--text-muted)" }
                }
              >
                {EXPENSE_CATEGORY_LABEL[c]}
              </Link>
            ))}
          </div>

          {expenses.length === 0 ? (
            <EmptyState title="No expenses recorded" description="Log the first expense on the right." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Category</Th>
                  <Th>Description</Th>
                  <Th align="right">Amount</Th>
                  <Th>Mode</Th>
                  <Th>By</Th>
                  {isAdmin ? <Th /> : null}
                </tr>
              </thead>
              <tbody>
                {expenses.map((x) => (
                  <Tr key={x.id}>
                    <Td>{formatDate(x.date)}</Td>
                    <Td>
                      <Badge>{EXPENSE_CATEGORY_LABEL[x.category as ExpenseCategory] ?? x.category}</Badge>
                    </Td>
                    <Td className="max-w-xs truncate">{x.description}</Td>
                    <Td align="right" className="font-semibold">{formatMoney(x.amountPaise)}</Td>
                    <Td><ModeBadge mode={x.mode} /></Td>
                    <Td className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      {x.recordedBy?.name ?? "—"}
                    </Td>
                    {isAdmin ? (
                      <Td align="right">
                        <form action={removeExpense}>
                          <input type="hidden" name="id" value={x.id} />
                          <ConfirmSubmit size="sm" variant="ghost" confirm="Delete this expense?">
                            Delete
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

        <div className="space-y-4">
          <Card>
            <CardHeader title="Record an expense" />
            <ExpenseForm />
          </Card>

          <Card>
            <CardHeader title="This month by category" />
            {breakdown.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px]" style={{ color: "var(--text-muted)" }}>
                Nothing recorded this month.
              </p>
            ) : (
              <dl className="divide-y">
                {[...breakdown]
                  .sort((a, b) => b.amountPaise - a.amountPaise)
                  .map((b) => (
                    <div key={b.category} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
                      <dt className="text-[13.5px]" style={{ color: "var(--text-muted)" }}>
                        {EXPENSE_CATEGORY_LABEL[b.category as ExpenseCategory] ?? b.category}
                        <span className="ml-1.5 text-[12px]">({b.count})</span>
                      </dt>
                      <dd className="text-[14px] font-semibold tnum">{formatMoney(b.amountPaise)}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </Card>

          <Note tone="brand" title="Approvals">
            Expenses post straight to the ledger. Whether an approval step is needed
            (scope section 5, item 10) is still open.
          </Note>
        </div>
      </div>
    </>
  );
}

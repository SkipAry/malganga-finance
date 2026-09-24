import type { Metadata } from "next";

import { ExpenseForm } from "./expense-form";
import { removeExpense } from "@/actions/operations";
import { FilterTabs } from "@/components/filter-tabs";
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
import type { MessageKey } from "@/lib/i18n";
import { LOCALE_TAG } from "@/lib/i18n";
import { getTranslate } from "@/lib/locale";
import { getSessionUser, requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [, t] = await Promise.all([requireStaff(), getTranslate()]);
  const tag = LOCALE_TAG[t.locale];
  const categoryLabel = (c: string) => t(`expenseCategory.${c}` as MessageKey);
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
      <PageHeader title={t("expenses.title")} subtitle={t("expenses.sub")} />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t("expenses.thisMonth")}
          value={formatMoney(monthAgg._sum.amountPaise ?? 0)}
          hint={t.plural(monthAgg._count, "expenses.entries.one", "expenses.entries.other")}
          tone="warn"
        />
        <StatTile label={t("expenses.thisYear")} value={formatMoney(yearAgg._sum.amountPaise ?? 0)} />
        <StatTile
          label={t("expenses.largestCategory")}
          value={
            breakdown.length
              ? categoryLabel(
                  [...breakdown].sort((a, b) => b.amountPaise - a.amountPaise)[0].category,
                )
              : "—"
          }
          hint={t("expenses.thisMonth")}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Card>
          <div className="border-b p-4">
            <FilterTabs
              basePath="/expenses"
              param="category"
              value={category}
              options={[
                { value: "all", label: t("common.all") },
                ...(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((c) => ({
                  value: c,
                  label: categoryLabel(c),
                })),
              ]}
            />
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              title={t("expenses.emptyTitle")}
              description={t("expenses.emptyBody")}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("th.date")}</Th>
                  <Th>{t("th.category")}</Th>
                  <Th>{t("th.description")}</Th>
                  <Th align="right">{t("th.amount")}</Th>
                  <Th>{t("th.mode")}</Th>
                  <Th>{t("th.by")}</Th>
                  {isAdmin ? <Th><span className="sr-only">{t("th.actions")}</span></Th> : null}
                </tr>
              </thead>
              <tbody>
                {expenses.map((x) => (
                  <Tr key={x.id}>
                    <Td>{formatDate(x.date, tag)}</Td>
                    <Td>
                      <Badge>{categoryLabel(x.category)}</Badge>
                    </Td>
                    <Td className="max-w-xs truncate">{x.description}</Td>
                    <Td align="right" className="font-semibold">{formatMoney(x.amountPaise)}</Td>
                    <Td><ModeBadge mode={x.mode} /></Td>
                    <Td className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {x.recordedBy?.name ?? "—"}
                    </Td>
                    {isAdmin ? (
                      <Td align="right">
                        <form action={removeExpense}>
                          <input type="hidden" name="id" value={x.id} />
                          <ConfirmSubmit size="sm" variant="ghost" confirm={t("expenses.deleteConfirm")}>
                            {t("common.delete")}
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
            <CardHeader title={t("expenses.record")} />
            <ExpenseForm />
          </Card>

          <Card>
            <CardHeader title={t("expenses.byCategory")} />
            {breakdown.length === 0 ? (
              <p className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("expenses.nothingThisMonth")}
              </p>
            ) : (
              <dl className="divide-y">
                {[...breakdown]
                  .sort((a, b) => b.amountPaise - a.amountPaise)
                  .map((b) => (
                    <div key={b.category} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
                      <dt className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {categoryLabel(b.category)}
                        <span className="ml-1.5 text-xs">({b.count})</span>
                      </dt>
                      <dd className="text-base font-semibold tnum">{formatMoney(b.amountPaise)}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </Card>

          <Note tone="brand" title={t("expenses.approvalsTitle")}>
            {t("expenses.approvalsBody")}
          </Note>
        </div>
      </div>
    </>
  );
}

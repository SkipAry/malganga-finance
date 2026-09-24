import type { Metadata } from "next";
import Link from "next/link";

import { FilterTabs } from "@/components/filter-tabs";
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
import { displayName } from "@/lib/display-name";
import { LOCALE_TAG } from "@/lib/i18n";
import { getTranslate } from "@/lib/locale";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const [, t] = await Promise.all([requireStaff(), getTranslate()]);
  const tag = LOCALE_TAG[t.locale];
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
        title={t("collections.title")}
        subtitle={t("collections.sub")}
        actions={
          <FilterTabs
            basePath="/collections"
            param="days"
            value={String(horizon)}
            variant="bordered"
            options={[
              { value: "0", label: t("collections.overdueOnly") },
              { value: "7", label: t("collections.days7") },
              { value: "30", label: t("collections.days30") },
            ]}
          />
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t("tile.overdue")}
          value={formatMoney(overdueTotal)}
          hint={t.plural(overdue.length, "emi.count.one", "emi.count.other")}
          tone={overdueTotal > 0 ? "risk" : "money"}
        />
        <StatTile
          label={t("collections.dueInDays", { n: horizon })}
          value={formatMoney(upcomingTotal)}
          hint={t.plural(upcoming.length, "emi.count.one", "emi.count.other")}
          tone="warn"
        />
        <StatTile label={t("collections.totalToCollect")} value={formatMoney(overdueTotal + upcomingTotal)} tone="brand" />
      </section>

      <Card className="mt-4">
        <CardHeader
          title={t("collections.worklist")}
          subtitle={t.plural(queue.length, "installment.count.one", "installment.count.other")}
        />
        {queue.length === 0 ? (
          <EmptyState
            title={t("collections.emptyTitle")}
            description={t("collections.emptyBody")}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("th.customer")}</Th>
                <Th>{t("th.contact")}</Th>
                <Th>{t("th.loan")}</Th>
                <Th>{t("th.due")}</Th>
                <Th align="right">{t("th.amount")}</Th>
                <Th align="right">{t("th.status")}</Th>
                <Th><span className="sr-only">{t("th.actions")}</span></Th>
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <Link href={`/customers/${row.loan.customerId}`} className="font-medium hover:underline">
                      {displayName(row.loan.customer, t.locale)}
                    </Link>
                  </Td>
                  <Td>
                    <a
                      href={`tel:${row.loan.customer.phone}`}
                      className="tap inline-flex min-h-8 items-center hover:underline"
                    >
                      {row.loan.customer.phone}
                    </a>
                  </Td>
                  <Td>
                    <Link href={`/loans/${row.loanId}`} className="hover:underline">
                      {row.loan.code}
                    </Link>
                    <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                      {t("emi.seq", { n: row.seq })}
                    </span>
                  </Td>
                  <Td>
                    {formatDate(row.dueDate, tag)}
                    <span
                      className="block text-xs"
                      style={{ color: row.overdue ? "var(--tone-risk)" : "var(--text-faint)" }}
                    >
                      {dueLabel(row.dueDate, today, t)}
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
                      {t("action.collect")}
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

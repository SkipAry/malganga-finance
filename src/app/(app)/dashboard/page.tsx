import type { Metadata } from "next";
import Link from "next/link";

import { CollectionHealthCard } from "@/components/collection-health-card";
import { StatTile } from "@/components/stat-tile";
import { InstallmentStatusBadge, ModeBadge } from "@/components/status-badges";
import { TrendChartLazy } from "@/components/trend-chart-lazy";
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
import { db } from "@/lib/db";
import { dueLabel, formatDate, startOfDay, startOfMonth } from "@/lib/dates";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import {
  collectionHealth,
  collectionQueue,
  monthlyTrend,
  portfolioSummary,
  type TrendPoint,
} from "@/lib/reports";
import { displayName } from "@/lib/display-name";
import { LOCALE_TAG, type Translate } from "@/lib/i18n";
import { getTranslate } from "@/lib/locale";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * One plain sentence saying what the chart shows, so the takeaway does not
 * depend on reading three overlapping lines (and so the chart has a text
 * equivalent for screen readers).
 */
function trendSummary(trend: TrendPoint[], t: Translate): string {
  if (trend.length < 2) return t("trend.tooShort");

  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const net = last.collected - last.disbursed - last.expenses;
  const rupees = (v: number) => formatMoneyCompact(Math.round(v * 100));

  const movement =
    last.collected > prev.collected
      ? t("trend.up", { amount: rupees(prev.collected), month: prev.label })
      : last.collected < prev.collected
        ? t("trend.down", { amount: rupees(prev.collected), month: prev.label })
        : t("trend.level", { month: prev.label });

  return t("trend.summary", {
    month: last.label,
    collected: rupees(last.collected),
    movement,
    disbursed: rupees(last.disbursed),
    expenses: rupees(last.expenses),
    direction: net >= 0 ? t("trend.inflow") : t("trend.outflow"),
    net: rupees(Math.abs(net)),
  });
}

export default async function DashboardPage() {
  const [user, t] = await Promise.all([requireStaff(), getTranslate()]);
  const tag = LOCALE_TAG[t.locale];
  const today = new Date();

  const [summary, trend, queue, recentPayments, health] = await Promise.all([
    portfolioSummary(today),
    monthlyTrend(6, today),
    collectionQueue(today, 7),
    db.payment.findMany({
      take: 6,
      orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
      include: { loan: { include: { customer: { select: { name: true, nameMr: true } } } } },
    }),
    collectionHealth(db, startOfDay(today), startOfMonth(today)),
  ]);

  const overdueRows = queue.filter((q) => q.overdue);
  const upcomingRows = queue.length - overdueRows.length;

  return (
    <>
      <PageHeader
        title={t("dashboard.title", { greeting: t(greetingKey()), name: user.name.split(" ")[0] })}
        subtitle={t("dashboard.asOn", { date: formatDate(today, tag) })}
        actions={
          <>
            <LinkButton href="/payments/new">{t("dashboard.recordPayment")}</LinkButton>
            <LinkButton href="/loans/new" variant="primary">
              {t("dashboard.newLoan")}
            </LinkButton>
          </>
        }
      />

      <section aria-labelledby="key-figures">
        <h2 id="key-figures" className="sr-only">
          {t("dashboard.keyFigures")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t("tile.outstanding")}
            value={formatMoneyCompact(summary.outstandingPaise)}
            status={t.plural(summary.activeLoans, "tile.activeLoans.one", "tile.activeLoans.other")}
            hint={t("tile.outstanding.hint")}
            tone="brand"
            href="/loans"
          />
          <StatTile
            label={t("tile.overdue")}
            value={formatMoneyCompact(summary.overduePaise)}
            status={
              summary.overdueCount
                ? t.plural(summary.overdueCount, "tile.overdue.one", "tile.overdue.other")
                : t("tile.overdue.none")
            }
            hint={summary.overdueCount ? t("tile.overdue.hint") : t("tile.overdue.hintNone")}
            tone={summary.overduePaise > 0 ? "risk" : "money"}
            href="/collections"
          />
          <StatTile
            label={t("tile.dueWeek")}
            value={formatMoneyCompact(summary.dueThisWeekPaise)}
            status={t.plural(upcomingRows, "tile.dueWeek.one", "tile.dueWeek.other")}
            hint={t("tile.dueWeek.hint")}
            tone="warn"
            href="/collections"
          />
          <StatTile
            label={t("tile.cash")}
            value={formatMoneyCompact(summary.cashInHandPaise)}
            status={summary.cashInHandPaise >= 0 ? t("tile.cash.surplus") : t("tile.cash.overdrawn")}
            hint={t("tile.cash.hint")}
            tone={summary.cashInHandPaise >= 0 ? "money" : "risk"}
          />
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title={t("card.cashMovement")} subtitle={trendSummary(trend, t)} />
          <TrendChartLazy
            data={trend}
            labels={{
              collected: t("chart.collected"),
              disbursed: t("chart.disbursed"),
              expenses: t("chart.expenses"),
            }}
          />
        </Card>

        <CollectionHealthCard health={health} t={t} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={t("card.needsCollection")}
            subtitle={
              overdueRows.length
                ? t("card.needsCollection.mixed", {
                    overdue: overdueRows.length,
                    upcoming: upcomingRows,
                  })
                : t("card.needsCollection.clean", { upcoming: upcomingRows })
            }
            action={
              <LinkButton href="/collections" size="sm">
                {t("action.viewAll")}
              </LinkButton>
            }
          />
          {queue.length === 0 ? (
            <EmptyState
              title={t("card.needsCollection.emptyTitle")}
              description={t("card.needsCollection.emptyBody")}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("th.customer")}</Th>
                  <Th>{t("th.due")}</Th>
                  <Th align="right">{t("th.amount")}</Th>
                  <Th align="right">{t("th.status")}</Th>
                  <Th><span className="sr-only">{t("th.actions")}</span></Th>
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, 6).map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link href={`/loans/${row.loanId}`} className="font-medium hover:underline">
                        {displayName(row.loan.customer, t.locale)}
                      </Link>
                      <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                        {row.loan.code} · EMI {row.seq}
                      </span>
                    </Td>
                    <Td>
                      <span className="block">{formatDate(row.dueDate, tag)}</span>
                      <span
                        className="text-xs"
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

        <Card>
          <CardHeader
            title={t("card.recentReceipts")}
            subtitle={t("card.recentReceipts.sub")}
            action={
              <LinkButton href="/payments" size="sm">
                View all
              </LinkButton>
            }
          />
          {recentPayments.length === 0 ? (
            <EmptyState
              title={t("card.recentReceipts.emptyTitle")}
              description={t("card.recentReceipts.emptyBody")}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("th.customer")}</Th>
                  <Th>{t("th.received")}</Th>
                  <Th align="right">{t("th.amount")}</Th>
                  <Th align="right">{t("th.mode")}</Th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <Link href={`/loans/${p.loanId}`} className="font-medium hover:underline">
                        {displayName(p.loan.customer, t.locale)}
                      </Link>
                      <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                        {p.loan.code}
                      </span>
                    </Td>
                    <Td>{formatDate(p.receivedOn, tag)}</Td>
                    <Td align="right" className="font-semibold text-ontone-money">
                      {formatMoney(p.amountPaise)}
                    </Td>
                    <Td align="right">
                      <ModeBadge mode={p.mode} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader title={t("card.bookSummary")} subtitle={t("card.bookSummary.sub")} />
          <dl className="grid grid-cols-2 gap-px border-t sm:grid-cols-3 xl:grid-cols-6" style={{ background: "var(--border)" }}>
            {[
              [t("book.customers"), String(summary.customers), false],
              [t("book.principal"), formatMoney(summary.principalOutPaise), false],
              [t("book.collected"), formatMoney(summary.collectedPaise), true],
              [t("book.investorCapital"), formatMoney(summary.investorCapitalPaise), false],
              [t("book.paidBack"), formatMoney(summary.investorWithdrawnPaise), false],
              [t("book.expenses"), formatMoney(summary.expensesPaise), false],
            ].map(([label, value, emphasis]) => (
              <div key={label as string} className="px-5 py-4" style={{ background: "var(--bg-elev)" }}>
                <dt className="text-xs font-medium uppercase tracking-[0.06em]" style={{ color: "var(--text-faint)" }}>
                  {label}
                </dt>
                <dd
                  className="mt-1.5 text-lg font-semibold tnum"
                  style={emphasis ? { color: "var(--tone-money)" } : undefined}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>
    </>
  );
}

function greetingKey(): "greeting.morning" | "greeting.afternoon" | "greeting.evening" {
  const h = new Date().getHours();
  if (h < 12) return "greeting.morning";
  if (h < 17) return "greeting.afternoon";
  return "greeting.evening";
}

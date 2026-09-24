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
import { displayName } from "@/lib/display-name";
import { LOCALE_TAG } from "@/lib/i18n";
import { getTranslate } from "@/lib/locale";
import { cleanInput } from "@/lib/validators";
import { getSessionUser, requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const [, t] = await Promise.all([requireStaff(), getTranslate()]);
  const tag = LOCALE_TAG[t.locale];
  const session = await getSessionUser();
  const isAdmin = session?.role === "ADMIN";
  const { q: rawQuery = "", mode = "all" } = await searchParams;
  // Cleaned like stored input, so a search typed with Devanagari digits or
  // a differently-composed letter still matches what was saved.
  const q = cleanInput(rawQuery);

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
                { loan: { customer: { nameMr: { contains: q } } } },
                { reference: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        loan: { include: { customer: { select: { id: true, name: true, nameMr: true } } } },
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
        title={t("payments.title")}
        subtitle={t("payments.sub")}
        actions={
          <LinkButton href="/payments/new" variant="primary">
            {t("dashboard.recordPayment")}
          </LinkButton>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t("payments.collectedMonth")}
          value={formatMoney(monthAgg._sum.amountPaise ?? 0)}
          hint={t.plural(monthAgg._count, "payments.receipts.one", "payments.receipts.other")}
          tone="money"
        />
        <StatTile label={t("payments.inCash")} value={formatMoney(cash)} tone="warn" />
        <StatTile label={t("payments.online")} value={formatMoney(online)} tone="brand" />
      </section>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <SearchBar placeholder={t("payments.search")} />
          <FilterTabs
            basePath="/payments"
            param="mode"
            value={mode}
            searchParams={{ q }}
            options={[
              { value: "all", label: t("common.all") },
              { value: "CASH", label: t("mode.CASH") },
              { value: "ONLINE", label: t("mode.ONLINE") },
            ]}
          />
        </div>

        {payments.length === 0 ? (
          <EmptyState
            title={q ? t("payments.noMatch") : t("payments.noneTitle")}
            description={q ? t("payments.trySearch") : t("payments.noneBody")}
            action={!q ? <LinkButton href="/payments/new" variant="primary">{t("dashboard.recordPayment")}</LinkButton> : null}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("th.received")}</Th>
                <Th>{t("th.customer")}</Th>
                <Th>{t("th.loan")}</Th>
                <Th align="right">{t("th.amount")}</Th>
                <Th>{t("th.mode")}</Th>
                <Th>{t("th.reference")}</Th>
                <Th>{t("th.recordedBy")}</Th>
                {isAdmin ? <Th><span className="sr-only">{t("th.actions")}</span></Th> : null}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <Tr key={p.id}>
                  <Td>{formatDate(p.receivedOn, tag)}</Td>
                  <Td>
                    <Link href={`/customers/${p.loan.customerId}`} className="font-medium hover:underline">
                      {displayName(p.loan.customer, t.locale)}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/loans/${p.loanId}`} className="hover:underline">
                      {p.loan.code}
                    </Link>
                    {p.installment ? (
                      <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                        {t("emi.seq", { n: p.installment.seq })}
                      </span>
                    ) : null}
                  </Td>
                  <Td align="right" className="font-semibold text-ontone-money">
                    {formatMoney(p.amountPaise)}
                  </Td>
                  <Td><ModeBadge mode={p.mode} /></Td>
                  <Td className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {p.reference ?? "—"}
                  </Td>
                  <Td className="text-sm" style={{ color: "var(--text-muted)" }}>
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
                          confirm={t("payments.reverseConfirm", { amount: formatMoney(p.amountPaise) })}
                        >
                          {t("payments.reverse")}
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

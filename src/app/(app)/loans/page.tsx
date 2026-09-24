import type { Metadata } from "next";
import Link from "next/link";

import { FilterTabs } from "@/components/filter-tabs";
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
import { displayName } from "@/lib/display-name";
import type { MessageKey } from "@/lib/i18n";
import { LOCALE_TAG } from "@/lib/i18n";
import { getTranslate } from "@/lib/locale";
import { cleanInput } from "@/lib/validators";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Loans" };

const TABS = [
  ["ACTIVE", "loanStatus.ACTIVE"],
  ["CLOSED", "loanStatus.CLOSED"],
  ["DEFAULTED", "loanStatus.DEFAULTED"],
  ["all", "common.all"],
] as const satisfies readonly (readonly [string, MessageKey])[];

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [, t] = await Promise.all([requireStaff(), getTranslate()]);
  const tag = LOCALE_TAG[t.locale];
  const { q: rawQuery = "", status = "ACTIVE" } = await searchParams;
  // Cleaned like stored input, so a search typed with Devanagari digits or
  // a differently-composed letter still matches what was saved.
  const q = cleanInput(rawQuery);

  const loans = await db.loan.findMany({
    where: {
      ...(status === "all" ? {} : { status }),
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { customer: { name: { contains: q } } },
              { customer: { nameMr: { contains: q } } },
              { customer: { phone: { contains: q } } },
            ],
          }
        : {}),
    },
    include: {
      customer: { select: { id: true, name: true, nameMr: true, code: true } },
      installments: { select: { dueDate: true, totalPaise: true, paidPaise: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const today = new Date();

  return (
    <>
      <PageHeader
        title={t("loans.title")}
        subtitle={t.plural(loans.length, "loans.count.one", "loans.count.other")}
        actions={
          <LinkButton href="/loans/new" variant="primary">
            {t("dashboard.newLoan")}
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <SearchBar placeholder={t("loans.search")} />
          <FilterTabs
            basePath="/loans"
            param="status"
            value={status}
            searchParams={{ q }}
            options={TABS.map(([value, key]) => ({ value, label: t(key) }))}
          />
        </div>

        {loans.length === 0 ? (
          <EmptyState
            title={q ? t("loans.noMatch") : t("loans.noneTitle")}
            description={q ? t("payments.trySearch") : t("loans.noneBody")}
            action={!q ? <LinkButton href="/loans/new" variant="primary">{t("dashboard.newLoan")}</LinkButton> : null}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("th.loan")}</Th>
                <Th>{t("th.customer")}</Th>
                <Th>{t("th.terms")}</Th>
                <Th align="right">{t("th.disbursed")}</Th>
                <Th align="right">{t("th.outstanding")}</Th>
                <Th>{t("th.repayment")}</Th>
                <Th align="right">{t("th.status")}</Th>
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
                      <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                        {formatDate(loan.disbursedOn, tag)}
                      </span>
                    </Td>
                    <Td>
                      <Link href={`/customers/${loan.customerId}`} className="hover:underline">
                        {displayName(loan.customer, t.locale)}
                      </Link>
                    </Td>
                    <Td>
                      <span className="text-sm">
                        {t("loans.terms", {
                          n: loan.tenure,
                          frequency:
                            loan.frequency === "WEEKLY"
                              ? t("frequency.weekly.lower")
                              : t("frequency.monthly.lower"),
                        })}
                      </span>
                      <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                        {t("loans.ratePerMonth", { rate: loan.interestRatePct })}
                      </span>
                    </Td>
                    <Td align="right">{formatMoney(loan.netDisbursedPaise)}</Td>
                    <Td align="right" className={overdue && owed > 0 ? "font-semibold text-ontone-risk" : "font-medium"}>
                      {formatMoney(owed)}
                    </Td>
                    <Td>
                      <div className="w-28">
                        <Progress value={pct(paid, total)} tone={overdue ? "risk" : "money"} />
                        <span className="mt-1 block text-xs tnum" style={{ color: "var(--text-faint)" }}>
                          {t("loans.pctRepaid", { pct: Math.round(pct(paid, total)) })}
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

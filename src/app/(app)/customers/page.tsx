import type { Metadata } from "next";
import Link from "next/link";

import { FilterTabs } from "@/components/filter-tabs";
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
import { displayName } from "@/lib/display-name";
import { LOCALE_TAG } from "@/lib/i18n";
import { getTranslate } from "@/lib/locale";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [, t] = await Promise.all([requireStaff(), getTranslate()]);
  const tag = LOCALE_TAG[t.locale];
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
        title={t("customers.title")}
        subtitle={t.plural(customers.length, "customers.count.one", "customers.count.other")}
        actions={
          <LinkButton href="/customers/new" variant="primary">
            {t("customers.add")}
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <SearchBar placeholder={t("customers.search")} />
          <FilterTabs
            basePath="/customers"
            param="status"
            value={status}
            searchParams={{ q }}
            options={[
              { value: "active", label: t("customers.active") },
              { value: "inactive", label: t("customers.inactive") },
              { value: "all", label: t("common.all") },
            ]}
          />
        </div>

        {customers.length === 0 ? (
          <EmptyState
            title={q ? t("customers.noMatch") : t("customers.noneTitle")}
            description={
              q ? t("customers.noMatchBody") : t("customers.noneBody")
            }
            action={!q ? <LinkButton href="/customers/new" variant="primary">{t("customers.add")}</LinkButton> : null}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("th.customer")}</Th>
                <Th>{t("th.contact")}</Th>
                <Th align="center">{t("th.loans")}</Th>
                <Th align="right">{t("th.outstanding")}</Th>
                <Th align="right">{t("tile.overdue")}</Th>
                <Th>{t("th.onboarded")}</Th>
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
                        {displayName(c, t.locale)}
                      </Link>
                      <span className="ml-2 text-xs" style={{ color: "var(--text-faint)" }}>
                        {c.code}
                      </span>
                      {!c.isActive ? (
                        <Badge className="ml-2">{t("customers.inactive")}</Badge>
                      ) : null}
                      {c.shopName ? (
                        <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                          {c.shopName}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <a href={`tel:${c.phone}`} className="tap inline-flex min-h-8 items-center hover:underline">
                        {c.phone}
                      </a>
                      {c.city ? (
                        <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                          {c.city}
                        </span>
                      ) : null}
                    </Td>
                    <Td align="center">
                      {c.loans.length}
                      {activeLoans ? (
                        <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                          {t("customers.activeLoans", { n: activeLoans })}
                        </span>
                      ) : null}
                    </Td>
                    <Td align="right">{outstanding ? formatMoney(outstanding) : "—"}</Td>
                    <Td align="right" className={overdue ? "font-semibold text-ontone-risk" : undefined}>
                      {overdue ? formatMoney(overdue) : "—"}
                    </Td>
                    <Td>{formatDate(c.createdAt, tag)}</Td>
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

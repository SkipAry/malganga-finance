import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollateralForm, DocumentForm } from "./attachment-forms";
import { reactivateCustomer, removeCollateral, removeCustomer, removeDocument } from "@/actions/customers";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { LoanStatusBadge } from "@/components/status-badges";
import { StatTile } from "@/components/stat-tile";
import {
  Badge,
  Card,
  CardHeader,
  DescList,
  EmptyState,
  LinkButton,
  Note,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { ASSET_TYPE_LABEL, DOCUMENT_KIND_LABEL, type AssetType, type DocumentKind } from "@/lib/enums";
import { isOverdue } from "@/lib/loan-service";
import { formatMoney } from "@/lib/money";
import { requireStaff } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id }, select: { name: true } });
  return { title: customer?.name ?? "Customer" };
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      collaterals: { orderBy: { createdAt: "desc" } },
      loans: {
        orderBy: { createdAt: "desc" },
        include: {
          installments: { select: { dueDate: true, totalPaise: true, paidPaise: true, status: true } },
        },
      },
    },
  });
  if (!customer) notFound();

  const today = new Date();
  let outstanding = 0;
  let overdue = 0;
  let disbursed = 0;
  for (const loan of customer.loans) {
    disbursed += loan.netDisbursedPaise;
    for (const inst of loan.installments) {
      const owed = Math.max(0, inst.totalPaise - inst.paidPaise);
      outstanding += owed;
      if (isOverdue(inst, today)) overdue += owed;
    }
  }

  const address = [
    customer.addressLine1,
    customer.addressLine2,
    customer.city,
    customer.state,
    customer.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={
          <>
            {customer.code}
            {!customer.isActive ? <Badge className="ml-2">Inactive</Badge> : null}
          </>
        }
        actions={
          <>
            <LinkButton href={`/customers/${customer.id}/edit`}>Edit</LinkButton>
            {customer.isActive ? (
              <form action={removeCustomer}>
                <input type="hidden" name="id" value={customer.id} />
                <ConfirmSubmit
                  variant="danger"
                  confirm={
                    customer.loans.length
                      ? `${customer.name} has ${customer.loans.length} loan(s) and will be deactivated, not deleted. Continue?`
                      : `Permanently delete ${customer.name}?`
                  }
                >
                  {customer.loans.length ? "Deactivate" : "Delete"}
                </ConfirmSubmit>
              </form>
            ) : (
              <form action={reactivateCustomer}>
                <input type="hidden" name="id" value={customer.id} />
                <ConfirmSubmit confirm={`Reactivate ${customer.name}?`}>Reactivate</ConfirmSubmit>
              </form>
            )}
            <LinkButton href={`/loans/new?customerId=${customer.id}`} variant="primary">
              New loan
            </LinkButton>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total disbursed" value={formatMoney(disbursed)} tone="brand" />
        <StatTile label="Outstanding" value={formatMoney(outstanding)} tone="neutral" />
        <StatTile
          label="Overdue"
          value={formatMoney(overdue)}
          tone={overdue > 0 ? "risk" : "money"}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Loans" action={<LinkButton href={`/loans/new?customerId=${customer.id}`} size="sm">Add</LinkButton>} />
            {customer.loans.length === 0 ? (
              <EmptyState title="No loans yet" description="Disburse the first loan for this customer." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Loan</Th>
                    <Th>Disbursed</Th>
                    <Th align="right">Amount</Th>
                    <Th align="right">Outstanding</Th>
                    <Th align="right">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {customer.loans.map((loan) => {
                    const owed = loan.installments.reduce(
                      (a, i) => a + Math.max(0, i.totalPaise - i.paidPaise),
                      0,
                    );
                    return (
                      <Tr key={loan.id}>
                        <Td>
                          <Link href={`/loans/${loan.id}`} className="font-medium hover:underline">
                            {loan.code}
                          </Link>
                          <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                            {loan.tenure} × {loan.frequency === "WEEKLY" ? "weekly" : "monthly"}
                          </span>
                        </Td>
                        <Td>{formatDate(loan.disbursedOn)}</Td>
                        <Td align="right">{formatMoney(loan.principalPaise)}</Td>
                        <Td align="right" className="font-medium">{formatMoney(owed)}</Td>
                        <Td align="right"><LoanStatusBadge status={loan.status} /></Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="KYC & documents" subtitle="Identity proof, Shop Act licence and photographs" />
            {customer.documents.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px]" style={{ color: "var(--text-muted)" }}>
                No documents on file yet.
              </p>
            ) : (
              <ul className="divide-y">
                {customer.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium">
                        {DOCUMENT_KIND_LABEL[doc.kind as DocumentKind] ?? doc.kind}
                      </p>
                      <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                        {doc.number ? `No. ${doc.number}` : "No number recorded"}
                        {doc.fileName ? ` · ${doc.fileName}` : ""}
                      </p>
                    </div>
                    {doc.fileData ? (
                      <a
                        href={doc.fileData}
                        download={doc.fileName ?? "document"}
                        className="text-[13px] font-medium text-brand-600 hover:underline"
                      >
                        Download
                      </a>
                    ) : null}
                    <form action={removeDocument}>
                      <input type="hidden" name="id" value={doc.id} />
                      <ConfirmSubmit size="sm" variant="ghost" confirm="Remove this document?">
                        Remove
                      </ConfirmSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t">
              <DocumentForm customerId={customer.id} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Collateral"
              subtitle="Assets pledged against lending"
            />
            {customer.collaterals.length === 0 ? (
              <div className="px-5 py-4">
                <Note tone="warn">
                  Nothing pledged. Scope item 2 — whether collateral is mandatory for every loan — is
                  still open, so the system does not enforce it.
                </Note>
              </div>
            ) : (
              <ul className="divide-y">
                {customer.collaterals.map((col) => (
                  <li key={col.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium">
                        {ASSET_TYPE_LABEL[col.assetType as AssetType] ?? col.assetType}
                        <span className="ml-2 font-normal tnum" style={{ color: "var(--text-muted)" }}>
                          {formatMoney(col.valuePaise)}
                        </span>
                      </p>
                      <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                        {col.description}
                      </p>
                    </div>
                    <form action={removeCollateral}>
                      <input type="hidden" name="id" value={col.id} />
                      <ConfirmSubmit size="sm" variant="ghost" confirm="Remove this collateral entry?">
                        Remove
                      </ConfirmSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t">
              <CollateralForm customerId={customer.id} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <div className="p-5">
              <DescList
                items={[
                  ["Mobile", <a key="p" href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>],
                  ["Alternate", customer.altPhone ?? "—"],
                  ["Email", customer.email ?? "—"],
                  ["Date of birth", formatDate(customer.dob)],
                  ["Address", address || "—"],
                  ["Shop", customer.shopName ?? "—"],
                  ["Shop Act no.", customer.shopActNo ?? "—"],
                  ["Onboarded", formatDate(customer.createdAt)],
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Referred by" />
            <div className="p-5">
              {customer.referrerName ? (
                <DescList
                  items={[
                    ["Name", customer.referrerName],
                    ["Contact", customer.referrerPhone ?? "—"],
                    ["Relationship", customer.referrerRelation ?? "—"],
                  ]}
                />
              ) : (
                <p className="text-[13.5px]" style={{ color: "var(--text-muted)" }}>
                  No referral recorded.
                </p>
              )}
            </div>
          </Card>

          {customer.notes ? (
            <Card>
              <CardHeader title="Notes" />
              <p className="whitespace-pre-wrap p-5 text-[13.5px] leading-relaxed">{customer.notes}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

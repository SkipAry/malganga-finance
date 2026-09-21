import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePayment, setLoanStatus, waiveInstallment } from "@/actions/loans";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PaymentForm } from "@/components/payment-form";
import { StatTile } from "@/components/stat-tile";
import { InstallmentStatusBadge, LoanStatusBadge, ModeBadge } from "@/components/status-badges";
import {
  Button,
  Card,
  CardHeader,
  DescList,
  EmptyState,
  Note,
  PageHeader,
  Progress,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { dueLabel, formatDate } from "@/lib/dates";
import {
  LOAN_STRUCTURE_LABEL,
  UPFRONT_MODE_LABEL,
  type LoanStructure,
  type UpfrontMode,
} from "@/lib/enums";
import { isOverdue } from "@/lib/loan-service";
import { formatMoney, pct } from "@/lib/money";
import { getSessionUser, requireStaff } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const loan = await db.loan.findUnique({ where: { id }, select: { code: true } });
  return { title: loan?.code ?? "Loan" };
}

export default async function LoanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const session = await getSessionUser();
  const isAdmin = session?.role === "ADMIN";
  const { id } = await params;

  const loan = await db.loan.findUnique({
    where: { id },
    include: {
      customer: true,
      installments: { orderBy: { seq: "asc" } },
      payments: {
        orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
        include: { recordedBy: { select: { name: true } } },
      },
      collaterals: true,
    },
  });
  if (!loan) notFound();

  const today = new Date();
  const scheduled = loan.installments.reduce((a, i) => a + i.totalPaise, 0);
  const paid = loan.installments.reduce((a, i) => a + i.paidPaise, 0);
  const owed = scheduled - paid;
  const overdueAmount = loan.installments
    .filter((i) => isOverdue(i, today))
    .reduce((a, i) => a + (i.totalPaise - i.paidPaise), 0);

  const openInstallments = loan.installments
    .filter((i) => i.status === "PENDING" || i.status === "PARTIAL")
    .map((i) => ({ id: i.id, seq: i.seq, dueDate: i.dueDate, owedPaise: i.totalPaise - i.paidPaise }));

  const nextDue = openInstallments[0];
  const collectedByReceipts = loan.payments.reduce((a, p) => a + p.amountPaise, 0);

  return (
    <>
      <PageHeader
        title={loan.code}
        subtitle={
          <>
            <Link href={`/customers/${loan.customerId}`} className="hover:underline">
              {loan.customer.name}
            </Link>
            {" · "}
            {loan.customer.phone}
          </>
        }
        actions={
          <>
            <LoanStatusBadge status={loan.status} />
            {isAdmin ? (
              <form action={setLoanStatus}>
                <input type="hidden" name="id" value={loan.id} />
                <input
                  type="hidden"
                  name="status"
                  value={loan.status === "DEFAULTED" ? "ACTIVE" : "DEFAULTED"}
                />
                <ConfirmSubmit
                  variant={loan.status === "DEFAULTED" ? "secondary" : "danger"}
                  confirm={
                    loan.status === "DEFAULTED"
                      ? "Return this loan to active?"
                      : "Mark this loan as defaulted?"
                  }
                >
                  {loan.status === "DEFAULTED" ? "Mark active" : "Mark defaulted"}
                </ConfirmSubmit>
              </form>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Loan amount" value={formatMoney(loan.principalPaise)} tone="brand" />
        <StatTile
          label="Cash disbursed"
          value={formatMoney(loan.netDisbursedPaise)}
          hint={
            loan.upfrontMode === "NONE"
              ? "No upfront deduction"
              : `${formatMoney(loan.principalPaise - loan.netDisbursedPaise)} withheld`
          }
        />
        <StatTile label="Collected" value={formatMoney(paid)} tone="money" />
        <StatTile
          label="Outstanding"
          value={formatMoney(owed)}
          hint={overdueAmount > 0 ? `${formatMoney(overdueAmount)} overdue` : nextDue ? dueLabel(nextDue.dueDate, today) : "Fully settled"}
          tone={overdueAmount > 0 ? "risk" : owed > 0 ? "warn" : "money"}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="EMI schedule"
              subtitle={`${loan.installments.filter((i) => i.status === "PAID").length} of ${loan.tenure} settled`}
              action={
                <div className="w-32">
                  <Progress value={pct(paid, scheduled)} tone={overdueAmount > 0 ? "risk" : "money"} />
                </div>
              }
            />
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Due date</Th>
                  <Th align="right">EMI</Th>
                  <Th align="right">Paid</Th>
                  <Th align="right">Status</Th>
                  {isAdmin ? <Th /> : null}
                </tr>
              </thead>
              <tbody>
                {loan.installments.map((inst) => {
                  const overdue = isOverdue(inst, today);
                  return (
                    <Tr key={inst.id}>
                      <Td className="tnum">{inst.seq}</Td>
                      <Td>
                        {formatDate(inst.dueDate)}
                        {overdue ? (
                          <span className="block text-[11.5px] text-ontone-risk">
                            {dueLabel(inst.dueDate, today)}
                          </span>
                        ) : null}
                      </Td>
                      <Td align="right">{formatMoney(inst.totalPaise)}</Td>
                      <Td align="right" className={inst.paidPaise > 0 ? "text-ontone-money" : undefined}>
                        {inst.paidPaise > 0 ? formatMoney(inst.paidPaise) : "—"}
                      </Td>
                      <Td align="right">
                        <InstallmentStatusBadge status={inst.status} overdue={overdue} />
                      </Td>
                      {isAdmin ? (
                        <Td align="right">
                          {inst.status === "PENDING" || inst.status === "PARTIAL" ? (
                            <form action={waiveInstallment}>
                              <input type="hidden" name="id" value={inst.id} />
                              <input type="hidden" name="loanId" value={loan.id} />
                              <ConfirmSubmit
                                size="sm"
                                variant="ghost"
                                confirm={`Waive EMI ${inst.seq}? The amount will no longer be collectable.`}
                              >
                                Waive
                              </ConfirmSubmit>
                            </form>
                          ) : null}
                        </Td>
                      ) : null}
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader
              title="Receipts"
              subtitle={`${loan.payments.length} recorded · ${formatMoney(collectedByReceipts)} received`}
            />
            {loan.payments.length === 0 ? (
              <EmptyState title="No receipts yet" description="Record the first EMI collection." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Received</Th>
                    <Th align="right">Amount</Th>
                    <Th>Mode</Th>
                    <Th>Reference</Th>
                    <Th>By</Th>
                    {isAdmin ? <Th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {loan.payments.map((p) => (
                    <Tr key={p.id}>
                      <Td>{formatDate(p.receivedOn)}</Td>
                      <Td align="right" className="font-semibold text-ontone-money">
                        {formatMoney(p.amountPaise)}
                      </Td>
                      <Td><ModeBadge mode={p.mode} /></Td>
                      <Td className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                        {p.reference ?? "—"}
                      </Td>
                      <Td className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                        {p.recordedBy?.name ?? "—"}
                      </Td>
                      {isAdmin ? (
                        <Td align="right">
                          <form action={deletePayment}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="loanId" value={loan.id} />
                            <ConfirmSubmit
                              size="sm"
                              variant="ghost"
                              confirm={`Reverse this receipt of ${formatMoney(p.amountPaise)}? The schedule will be recalculated.`}
                            >
                              Reverse
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
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
          <Card>
            <CardHeader title="Record a receipt" subtitle="All payments are entered manually" />
            {openInstallments.length === 0 ? (
              <div className="p-5">
                <Note tone="money">This loan is fully settled. Nothing left to collect.</Note>
              </div>
            ) : (
              <PaymentForm loanId={loan.id} installments={openInstallments} compact />
            )}
          </Card>

          <Card>
            <CardHeader title="Loan terms" />
            <div className="p-5">
              <DescList
                items={[
                  ["Structure", LOAN_STRUCTURE_LABEL[loan.structure as LoanStructure] ?? loan.structure],
                  ["Frequency", loan.frequency === "WEEKLY" ? "Weekly" : "Monthly"],
                  ["Interest rate", `${loan.interestRatePct}% per month`],
                  ["Tenure", `${loan.tenure} installments`],
                  ["Disbursed on", formatDate(loan.disbursedOn)],
                  ["Disbursed by", loan.disbursementMode === "CASH" ? "Cash" : "Online"],
                  ["First EMI", formatDate(loan.firstEmiOn)],
                  ["Last EMI", formatDate(loan.lastEmiOn)],
                  ["Upfront", UPFRONT_MODE_LABEL[loan.upfrontMode as UpfrontMode] ?? loan.upfrontMode],
                  ["Total scheduled", formatMoney(scheduled)],
                ]}
              />
              {loan.notes ? (
                <p className="mt-4 whitespace-pre-wrap border-t pt-4 text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {loan.notes}
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="no-print">
            <CardHeader title="Actions" />
            <div className="flex flex-wrap gap-2 p-5">
              <Link href={`/customers/${loan.customerId}`} className="contents">
                <Button type="button">View customer</Button>
              </Link>
              <Link href={`/loans/${loan.id}/schedule`} className="contents">
                <Button type="button">Printable schedule</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

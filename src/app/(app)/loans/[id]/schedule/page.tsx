import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { Card, LinkButton, Table, Td, Th, Tr } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { INSTALLMENT_STATUS_LABEL, type InstallmentStatus } from "@/lib/enums";
import { formatMoney } from "@/lib/money";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Repayment schedule" };

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const loan = await db.loan.findUnique({
    where: { id },
    include: { customer: true, installments: { orderBy: { seq: "asc" } } },
  });
  if (!loan) notFound();

  const scheduled = loan.installments.reduce((a, i) => a + i.totalPaise, 0);
  const paid = loan.installments.reduce((a, i) => a + i.paidPaise, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <LinkButton href={`/loans/${loan.id}`}>Back to loan</LinkButton>
        <PrintButton />
      </div>

      <Card className="p-8">
        <header className="mb-6 border-b pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
            Malganga Finance
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Repayment schedule</h1>
          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            {[
              ["Loan", loan.code],
              ["Customer", loan.customer.name],
              ["Mobile", loan.customer.phone],
              ["Loan amount", formatMoney(loan.principalPaise)],
              ["Disbursed", formatDate(loan.disbursedOn)],
              ["Cash received", formatMoney(loan.netDisbursedPaise)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt style={{ color: "var(--text-faint)" }}>{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </header>

        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Due date</Th>
              <Th align="right">EMI</Th>
              <Th align="right">Paid</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {loan.installments.map((inst) => (
              <Tr key={inst.id}>
                <Td className="tnum">{inst.seq}</Td>
                <Td>{formatDate(inst.dueDate)}</Td>
                <Td align="right">{formatMoney(inst.totalPaise)}</Td>
                <Td align="right">{inst.paidPaise ? formatMoney(inst.paidPaise) : "—"}</Td>
                <Td align="right" className="text-sm">
                  {INSTALLMENT_STATUS_LABEL[inst.status as InstallmentStatus] ?? inst.status}
                </Td>
              </Tr>
            ))}
            <tr>
              <Td colSpan={2} className="font-semibold">Total</Td>
              <Td align="right" className="font-semibold">{formatMoney(scheduled)}</Td>
              <Td align="right" className="font-semibold">{formatMoney(paid)}</Td>
              <Td />
            </tr>
          </tbody>
        </Table>

        <p className="mt-6 text-xs" style={{ color: "var(--text-faint)" }}>
          Generated {formatDate(new Date())}. Amounts in Indian Rupees.
        </p>
      </Card>
    </div>
  );
}

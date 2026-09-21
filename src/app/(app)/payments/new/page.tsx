import type { Metadata } from "next";

import { LoanPicker } from "./loan-picker";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { isOverdue } from "@/lib/loan-service";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Record payment" };

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ loanId?: string }>;
}) {
  await requireStaff();
  const { loanId } = await searchParams;

  const loans = await db.loan.findMany({
    where: { status: { in: ["ACTIVE", "DEFAULTED"] } },
    include: {
      customer: { select: { name: true, phone: true } },
      installments: {
        where: { status: { in: ["PENDING", "PARTIAL"] } },
        orderBy: { seq: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const today = new Date();
  const options = loans
    .filter((loan) => loan.installments.length > 0)
    .map((loan) => ({
      id: loan.id,
      code: loan.code,
      customerName: loan.customer.name,
      customerPhone: loan.customer.phone,
      overdue: loan.installments.some((i) => isOverdue(i, today)),
      installments: loan.installments.map((i) => ({
        id: i.id,
        seq: i.seq,
        dueDate: i.dueDate,
        owedPaise: i.totalPaise - i.paidPaise,
      })),
    }));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Record a payment" subtitle="Manual entry for cash and online collections." />
      {options.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing outstanding"
            description="Every active loan is fully collected."
            action={<LinkButton href="/loans" variant="primary">View loans</LinkButton>}
          />
        </Card>
      ) : (
        <LoanPicker loans={options} defaultLoanId={loanId} />
      )}
    </div>
  );
}

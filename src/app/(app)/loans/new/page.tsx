import type { Metadata } from "next";

import { LoanForm } from "../loan-form";
import { EmptyState, Card, LinkButton, PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "New loan" };

export default async function NewLoanPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  await requireStaff();
  const { customerId } = await searchParams;

  const customers = await db.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, phone: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Disburse a loan" subtitle="The EMI schedule and reminders are generated on save." />
      {customers.length === 0 ? (
        <Card>
          <EmptyState
            title="No active customers"
            description="Onboard a customer before disbursing a loan."
            action={<LinkButton href="/customers/new" variant="primary">Add customer</LinkButton>}
          />
        </Card>
      ) : (
        <LoanForm customers={customers} defaultCustomerId={customerId} />
      )}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CustomerForm } from "../../customer-form";
import { PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Edit customer" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit ${customer.name}`} subtitle={customer.code} />
      <CustomerForm values={customer} />
    </div>
  );
}

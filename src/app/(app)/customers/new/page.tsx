import type { Metadata } from "next";

import { CustomerForm } from "../customer-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "New customer" };

export default async function NewCustomerPage() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New customer" subtitle="Onboard a borrower. KYC and collateral are added after saving." />
      <CustomerForm />
    </div>
  );
}

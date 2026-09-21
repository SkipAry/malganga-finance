import type { Metadata } from "next";

import { InvestorForm } from "../investor-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "New investor" };

export default async function NewInvestorPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add investor" subtitle="Record the investment itself after saving the profile." />
      <InvestorForm />
    </div>
  );
}

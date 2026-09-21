import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InvestorForm } from "../../investor-form";
import { PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Edit investor" };

export default async function EditInvestorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const investor = await db.investor.findUnique({ where: { id } });
  if (!investor) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Edit ${investor.name}`} subtitle={investor.code} />
      <InvestorForm values={investor} />
    </div>
  );
}

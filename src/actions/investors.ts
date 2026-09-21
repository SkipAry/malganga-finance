"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { nextCode } from "@/lib/loan-service";
import { assertAdmin, recordAudit } from "@/lib/session";
import { fieldErrors, investorSchema, investorTxnSchema } from "@/lib/validators";
import type { FormState } from "./auth";

function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export async function saveInvestor(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await assertAdmin();
  const id = formData.get("id") as string | null;

  const parsed = investorSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  let investorId = id ?? "";
  if (id) {
    await db.investor.update({ where: { id }, data: parsed.data });
    await recordAudit(user.id, "UPDATE", "Investor", id);
  } else {
    const created = await db.investor.create({
      data: { ...parsed.data, code: await nextCode(db, "investor") },
    });
    investorId = created.id;
    await recordAudit(user.id, "CREATE", "Investor", created.id, { name: created.name });
  }

  revalidatePath("/investors");
  redirect(`/investors/${investorId}`);
}

/** Investors with a transaction history are deactivated, never erased. */
export async function removeInvestor(formData: FormData): Promise<void> {
  const user = await assertAdmin();
  const id = String(formData.get("id"));

  const txns = await db.investorTxn.count({ where: { investorId: id } });
  if (txns > 0) {
    await db.investor.update({ where: { id }, data: { isActive: false } });
    await recordAudit(user.id, "DEACTIVATE", "Investor", id, { reason: "has transactions" });
  } else {
    await db.investor.delete({ where: { id } });
    await recordAudit(user.id, "DELETE", "Investor", id);
  }

  revalidatePath("/investors");
  redirect("/investors");
}

export async function addInvestorTxn(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await assertAdmin();

  const parsed = investorTxnSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { amount, ...rest } = parsed.data;

  // A withdrawal cannot exceed what is still with the business.
  if (rest.type !== "INVESTMENT") {
    const txns = await db.investorTxn.findMany({ where: { investorId: rest.investorId } });
    const balance = txns.reduce(
      (a, t) => a + (t.type === "INVESTMENT" ? t.amountPaise : -t.amountPaise),
      0,
    );
    if (amount > balance) {
      return {
        errors: {
          amount: `Only ₹${(balance / 100).toLocaleString("en-IN")} is available to withdraw.`,
        },
      };
    }
  }

  const txn = await db.investorTxn.create({ data: { ...rest, amountPaise: amount } });
  await recordAudit(user.id, "CREATE", "InvestorTxn", txn.id, { type: txn.type });

  revalidatePath(`/investors/${rest.investorId}`);
  revalidatePath("/investors");
  return { message: "Transaction recorded." };
}

export async function removeInvestorTxn(formData: FormData): Promise<void> {
  const user = await assertAdmin();
  const id = String(formData.get("id"));
  const txn = await db.investorTxn.delete({ where: { id } });
  await recordAudit(user.id, "DELETE", "InvestorTxn", id);
  revalidatePath(`/investors/${txn.investorId}`);
}

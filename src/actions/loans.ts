"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { applyPayment, createLoanWithSchedule, reversePayment } from "@/lib/loan-service";
import { assertAdmin, assertStaff, recordAudit } from "@/lib/session";
import { fieldErrors, loanSchema, paymentSchema } from "@/lib/validators";
import type { FormState } from "./auth";

function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export async function createLoan(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await assertStaff();

  const parsed = loanSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  let loanId: string;
  try {
    const loan = await db.$transaction((tx) =>
      createLoanWithSchedule(tx, {
        customerId: parsed.data.customerId,
        principalPaise: parsed.data.principal,
        interestRatePct: parsed.data.interestRatePct,
        tenure: parsed.data.tenure,
        frequency: parsed.data.frequency,
        structure: parsed.data.structure,
        disbursedOn: parsed.data.disbursedOn,
        disbursementMode: parsed.data.disbursementMode,
        firstEmiOn: parsed.data.firstEmiOn,
        upfrontMode: parsed.data.upfrontMode,
        notes: parsed.data.notes,
      }),
    );
    loanId = loan.id;
    await recordAudit(user.id, "CREATE", "Loan", loan.id, {
      code: loan.code,
      principalPaise: loan.principalPaise,
    });
  } catch (err) {
    return { errors: { _form: (err as Error).message } };
  }

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  redirect(`/loans/${loanId}`);
}

export async function recordPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await assertStaff();

  const parsed = paymentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  let unallocated = 0;
  try {
    const result = await db.$transaction((tx) =>
      applyPayment(tx, {
        loanId: parsed.data.loanId,
        installmentId: parsed.data.installmentId,
        amountPaise: parsed.data.amount,
        mode: parsed.data.mode,
        receivedOn: parsed.data.receivedOn,
        reference: parsed.data.reference,
        note: parsed.data.note,
        recordedById: user.id,
      }),
    );
    unallocated = result.unallocatedPaise;
    await recordAudit(user.id, "CREATE", "Payment", result.payment.id, {
      loanId: parsed.data.loanId,
      amountPaise: parsed.data.amount,
    });
  } catch (err) {
    return { errors: { _form: (err as Error).message } };
  }

  revalidatePath(`/loans/${parsed.data.loanId}`);
  revalidatePath("/payments");
  revalidatePath("/collections");
  revalidatePath("/dashboard");

  return {
    message:
      unallocated > 0
        ? `Receipt saved. ₹${(unallocated / 100).toLocaleString("en-IN")} exceeded the outstanding schedule and is held as an advance.`
        : "Receipt saved.",
  };
}

/** Admin-only: reversing money already banked is not a routine action. */
export async function deletePayment(formData: FormData): Promise<void> {
  const user = await assertAdmin();
  const id = String(formData.get("id"));
  const loanId = String(formData.get("loanId"));

  await db.$transaction((tx) => reversePayment(tx, id));
  await recordAudit(user.id, "DELETE", "Payment", id, { loanId });

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

export async function setLoanStatus(formData: FormData): Promise<void> {
  const user = await assertAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["ACTIVE", "CLOSED", "DEFAULTED"].includes(status)) throw new Error("Unknown status");

  await db.loan.update({ where: { id }, data: { status } });
  await recordAudit(user.id, "UPDATE", "Loan", id, { status });
  revalidatePath(`/loans/${id}`);
  revalidatePath("/loans");
}

export async function waiveInstallment(formData: FormData): Promise<void> {
  const user = await assertAdmin();
  const id = String(formData.get("id"));
  const loanId = String(formData.get("loanId"));

  await db.$transaction(async (tx) => {
    await tx.installment.update({ where: { id }, data: { status: "WAIVED" } });
    await tx.notification.updateMany({
      where: { installmentId: id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  });
  await recordAudit(user.id, "WAIVE", "Installment", id, { loanId });
  revalidatePath(`/loans/${loanId}`);
}

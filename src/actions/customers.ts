"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { MAX_UPLOAD_BYTES } from "@/lib/downscale-image";
import { nextCode } from "@/lib/loan-service";
import { assertStaff, recordAudit } from "@/lib/session";
import {
  collateralSchema,
  customerSchema,
  documentSchema,
  fieldErrors,
} from "@/lib/validators";
import type { FormState } from "./auth";

function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export async function saveCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await assertStaff();
  const id = formData.get("id") as string | null;

  const parsed = customerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  let customerId = id ?? "";
  if (id) {
    await db.customer.update({ where: { id }, data: parsed.data });
    await recordAudit(user.id, "UPDATE", "Customer", id);
  } else {
    const created = await db.customer.create({
      data: { ...parsed.data, code: await nextCode(db, "customer") },
    });
    customerId = created.id;
    await recordAudit(user.id, "CREATE", "Customer", created.id, { name: created.name });
  }

  revalidatePath("/customers");
  redirect(`/customers/${customerId}`);
}

/**
 * Soft-deletes by default. A customer with loans is never hard-deleted — the
 * ledger has to stay reconstructable — so the record is deactivated instead.
 */
export async function removeCustomer(formData: FormData): Promise<void> {
  const user = await assertStaff();
  const id = String(formData.get("id"));

  const loans = await db.loan.count({ where: { customerId: id } });
  if (loans > 0) {
    await db.customer.update({ where: { id }, data: { isActive: false } });
    await recordAudit(user.id, "DEACTIVATE", "Customer", id, { reason: "has loans" });
  } else {
    await db.customer.delete({ where: { id } });
    await recordAudit(user.id, "DELETE", "Customer", id);
  }

  revalidatePath("/customers");
  redirect("/customers");
}

export async function reactivateCustomer(formData: FormData): Promise<void> {
  const user = await assertStaff();
  const id = String(formData.get("id"));
  await db.customer.update({ where: { id }, data: { isActive: true } });
  await recordAudit(user.id, "REACTIVATE", "Customer", id);
  revalidatePath(`/customers/${id}`);
}

export async function addDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await assertStaff();

  const file = formData.get("file");
  let fileData: string | null = null;
  let fileName: string | null = null;

  if (file instanceof File && file.size > 0) {
    // The real constraint is Vercel's 4.5 MB request-body limit, which
    // multipart overhead and the other form fields eat into; staying well
    // under it means an over-sized upload gets this message rather than a
    // platform 413 with no explanation. The browser downscales photos before
    // they get here, but that is a convenience on untrusted ground - this
    // check is the one that actually holds.
    if (file.size > MAX_UPLOAD_BYTES) {
      return { errors: { file: "File must be 3 MB or smaller" } };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    fileData = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    fileName = file.name;
  }

  const parsed = documentSchema.safeParse({ ...formToObject(formData), fileName, fileData });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const doc = await db.document.create({ data: parsed.data });
  await recordAudit(user.id, "CREATE", "Document", doc.id, { kind: doc.kind });

  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { message: "Document added." };
}

export async function removeDocument(formData: FormData): Promise<void> {
  const user = await assertStaff();
  const id = String(formData.get("id"));
  const doc = await db.document.delete({ where: { id } });
  await recordAudit(user.id, "DELETE", "Document", id);
  revalidatePath(`/customers/${doc.customerId}`);
}

export async function addCollateral(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await assertStaff();
  const parsed = collateralSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { value, loanId, ...rest } = parsed.data;
  const row = await db.collateral.create({
    data: { ...rest, loanId: loanId || null, valuePaise: value },
  });
  await recordAudit(user.id, "CREATE", "Collateral", row.id);

  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { message: "Collateral recorded." };
}

export async function removeCollateral(formData: FormData): Promise<void> {
  const user = await assertStaff();
  const id = String(formData.get("id"));
  const row = await db.collateral.delete({ where: { id } });
  await recordAudit(user.id, "DELETE", "Collateral", id);
  revalidatePath(`/customers/${row.customerId}`);
}

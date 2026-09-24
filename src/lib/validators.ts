/** Input validation at the trust boundary. Every server action parses through here. */
import { z } from "zod";

import {
  ASSET_TYPES,
  DOCUMENT_KINDS,
  EXPENSE_CATEGORIES,
  INVESTOR_TXN_TYPES,
  INVESTOR_TYPES,
  LOAN_FREQUENCIES,
  LOAN_STRUCTURES,
  PAYMENT_MODES,
  ROLES,
  UPFRONT_MODES,
} from "./enums";
import { toPaise } from "./money";

/** Rupee text field -> integer paise. Accepts "1,00,000", "₹ 7000", "7000.50". */
export const rupees = z
  .string()
  .trim()
  .min(1, "Required")
  .transform((v, ctx) => {
    try {
      const paise = toPaise(v);
      if (paise <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be greater than zero" });
        return z.NEVER;
      }
      return paise;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid amount" });
      return z.NEVER;
    }
  });

export const dateField = z
  .string()
  .trim()
  .min(1, "Required")
  .transform((v, ctx) => {
    const d = new Date(`${v}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid date" });
      return z.NEVER;
    }
    return d;
  });

/**
 * Optional fields must tolerate the key being ABSENT, not just empty: a form
 * that does not render an input sends no key at all, and a bare z.string()
 * would reject the whole submission with "Required" — invisibly, because
 * there is no field on screen to attach the message to.
 */
export const optionalDateField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(`${v}T00:00:00`) : null));

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v == null || v === "" ? null : v));

const optionalEmail = z
  .union([z.string().trim().email("Enter a valid email"), z.literal(""), z.undefined()])
  .transform((v) => v || null);

export const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{7,15}$/, "Enter a valid phone number");

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  // Optional: blank means the Latin name is used in both languages.
  nameMr: optionalText,
  phone,
  altPhone: optionalText,
  email: optionalEmail,
  dob: optionalDateField,
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  state: optionalText,
  pincode: optionalText,
  shopName: optionalText,
  shopActNo: optionalText,
  referrerName: optionalText,
  referrerPhone: optionalText,
  referrerRelation: optionalText,
  notes: optionalText,
});

export const documentSchema = z.object({
  customerId: z.string().min(1),
  kind: z.enum(DOCUMENT_KINDS),
  label: optionalText,
  number: optionalText,
  fileName: optionalText,
  fileData: optionalText,
});

export const collateralSchema = z.object({
  customerId: z.string().min(1),
  loanId: optionalText,
  assetType: z.enum(ASSET_TYPES),
  description: z.string().trim().min(2, "Describe the asset"),
  value: rupees,
});

export const loanSchema = z
  .object({
    customerId: z.string().min(1, "Select a customer"),
    principal: rupees,
    interestRatePct: z.coerce.number().min(0, "Cannot be negative").max(100, "Too high"),
    tenure: z.coerce.number().int().min(1, "At least 1 EMI").max(520, "Too many EMIs"),
    frequency: z.enum(LOAN_FREQUENCIES),
    structure: z.enum(LOAN_STRUCTURES),
    disbursedOn: dateField,
    disbursementMode: z.enum(PAYMENT_MODES),
    firstEmiOn: dateField,
    upfrontMode: z.enum(UPFRONT_MODES),
    notes: optionalText,
  })
  .refine((v) => v.firstEmiOn >= v.disbursedOn, {
    message: "First EMI cannot fall before the disbursement date",
    path: ["firstEmiOn"],
  });

export const paymentSchema = z.object({
  loanId: z.string().min(1, "Select a loan"),
  installmentId: optionalText,
  amount: rupees,
  mode: z.enum(PAYMENT_MODES),
  receivedOn: dateField,
  reference: optionalText,
  note: optionalText,
});

export const investorSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  // Optional: blank means the Latin name is used in both languages.
  nameMr: optionalText,
  phone,
  email: optionalEmail,
  type: z.enum(INVESTOR_TYPES),
  interestRatePct: z.coerce.number().min(0).max(100),
  address: optionalText,
});

export const investorTxnSchema = z.object({
  investorId: z.string().min(1),
  type: z.enum(INVESTOR_TXN_TYPES),
  amount: rupees,
  date: dateField,
  mode: z.enum(PAYMENT_MODES),
  note: optionalText,
});

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: rupees,
  date: dateField,
  description: z.string().trim().min(2, "Describe the expense").max(300),
  mode: z.enum(PAYMENT_MODES),
});

export const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  role: z.enum(ROLES),
  investorId: optionalText,
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(128)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

/** Turns a ZodError into the { field: message } shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

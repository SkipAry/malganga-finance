/**
 * Enum-like value sets. SQLite cannot store native enums, so these constants are
 * the single source of truth for the allowed strings and their display labels.
 */

export const ROLES = ["ADMIN", "AGENT", "INVESTOR"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  AGENT: "Collection Agent",
  INVESTOR: "Investor",
};

export const PAYMENT_MODES = ["ONLINE", "CASH"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const LOAN_FREQUENCIES = ["WEEKLY", "MONTHLY"] as const;
export type LoanFrequency = (typeof LOAN_FREQUENCIES)[number];

export const LOAN_STRUCTURES = [
  "FLAT_UPFRONT",
  "INTEREST_ONLY",
  "INTEREST_PRINCIPAL",
] as const;
export type LoanStructure = (typeof LOAN_STRUCTURES)[number];

export const LOAN_STRUCTURE_LABEL: Record<LoanStructure, string> = {
  FLAT_UPFRONT: "Flat (first EMI upfront)",
  INTEREST_ONLY: "Interest only",
  INTEREST_PRINCIPAL: "Interest + Principal",
};

export const LOAN_STRUCTURE_HINT: Record<LoanStructure, string> = {
  FLAT_UPFRONT:
    "The EMIs add up to exactly the loan amount; the lender's return comes from the upfront withholding. Reproduces the Malganga worked example.",
  INTEREST_ONLY:
    "Every EMI is interest only; the full principal falls due with the final EMI.",
  INTEREST_PRINCIPAL:
    "Flat interest across the tenure, split evenly with the principal over all EMIs.",
};

export const LOAN_STATUSES = ["ACTIVE", "CLOSED", "DEFAULTED"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const INSTALLMENT_STATUSES = [
  "PENDING",
  "PARTIAL",
  "PAID",
  "WAIVED",
  "DEDUCTED_AT_DISBURSAL",
] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  PENDING: "Pending",
  PARTIAL: "Part paid",
  PAID: "Paid",
  WAIVED: "Waived",
  DEDUCTED_AT_DISBURSAL: "Deducted upfront",
};

export const INVESTOR_TYPES = ["INTERNAL", "EXTERNAL"] as const;
export type InvestorType = (typeof INVESTOR_TYPES)[number];

export const INVESTOR_TXN_TYPES = [
  "INVESTMENT",
  "WITHDRAWAL",
  "INTEREST_PAYOUT",
] as const;
export type InvestorTxnType = (typeof INVESTOR_TXN_TYPES)[number];

export const INVESTOR_TXN_LABEL: Record<InvestorTxnType, string> = {
  INVESTMENT: "Investment in",
  WITHDRAWAL: "Withdrawal",
  INTEREST_PAYOUT: "Interest payout",
};

export const EXPENSE_CATEGORIES = [
  "DAILY",
  "TRANSPORT",
  "MONTHLY",
  "ACCOUNTING",
  "MAINTENANCE",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  DAILY: "Daily expense",
  TRANSPORT: "Transport",
  MONTHLY: "Monthly expense",
  ACCOUNTING: "Accounting",
  MAINTENANCE: "Maintenance",
};

export const DOCUMENT_KINDS = [
  "AADHAAR",
  "PAN",
  "VOTER_ID",
  "DRIVING_LICENCE",
  "PASSPORT",
  "SHOP_ACT",
  "PHOTO_CUSTOMER",
  "PHOTO_SHOP",
  "PHOTO_COLLATERAL",
  "OTHER",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  AADHAAR: "Aadhaar",
  PAN: "PAN card",
  VOTER_ID: "Voter ID",
  DRIVING_LICENCE: "Driving licence",
  PASSPORT: "Passport",
  SHOP_ACT: "Shop Act licence",
  PHOTO_CUSTOMER: "Customer photograph",
  PHOTO_SHOP: "Shop photograph",
  PHOTO_COLLATERAL: "Collateral photograph",
  OTHER: "Other document",
};

export const KYC_KINDS: DocumentKind[] = [
  "AADHAAR",
  "PAN",
  "VOTER_ID",
  "DRIVING_LICENCE",
  "PASSPORT",
];

export const ASSET_TYPES = [
  "GOLD",
  "VEHICLE",
  "PROPERTY",
  "MACHINERY",
  "STOCK",
  "OTHER",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  GOLD: "Gold / jewellery",
  VEHICLE: "Vehicle",
  PROPERTY: "Property",
  MACHINERY: "Machinery",
  STOCK: "Shop stock",
  OTHER: "Other",
};

export const NOTIFICATION_KINDS = ["BEFORE_DUE", "ON_DUE", "OVERDUE"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  BEFORE_DUE: "Day-before reminder",
  ON_DUE: "Due-date reminder",
  OVERDUE: "Overdue reminder",
};

export const NOTIFICATION_CHANNELS = ["SMS", "WHATSAPP", "EMAIL"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * How the upfront withholding at disbursement is treated.
 *
 * Scope 4.1 says the first EMI is deducted at disbursement and "the remaining
 * 13 EMIs are then collected". Taken literally that is SETTLES_EMI_1 - and it
 * nets the lender exactly zero (pay out 93,000, collect 93,000). The only
 * reading of the worked example that produces a margin (7,000, ~2.33%/month on
 * the cash advanced) is EXTRA_CHARGE, so that is the default. This is scope
 * section 5, item 4 and must be confirmed by Malganga.
 */
export const UPFRONT_MODES = ["NONE", "SETTLES_EMI_1", "EXTRA_CHARGE"] as const;
export type UpfrontMode = (typeof UPFRONT_MODES)[number];

export const UPFRONT_MODE_LABEL: Record<UpfrontMode, string> = {
  NONE: "No upfront deduction",
  SETTLES_EMI_1: "Deduct EMI 1 and treat it as paid",
  EXTRA_CHARGE: "Deduct one EMI as an upfront charge",
};

export const UPFRONT_MODE_HINT: Record<UpfrontMode, string> = {
  NONE: "The full loan amount is handed over and every EMI is collected on schedule.",
  SETTLES_EMI_1:
    "One EMI is withheld and installment 1 is marked settled, so only the remaining EMIs are collected. On a flat loan this returns exactly the amount advanced - no margin.",
  EXTRA_CHARGE:
    "One EMI is withheld as an upfront charge and the full schedule is still collected. This is the reading of the scope example that yields a lender margin.",
};

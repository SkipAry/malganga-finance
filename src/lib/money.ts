/**
 * Money helpers. Every amount in the database is an integer number of paise;
 * rupees only exist at the UI boundary. This keeps EMI splits exact.
 */

export const PAISE = 100;

/** Parse a user-entered rupee string/number into integer paise. */
export function toPaise(rupees: string | number): number {
  const n = typeof rupees === "string" ? Number(rupees.replace(/[,\s₹]/g, "")) : rupees;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * PAISE);
}

export function toRupees(paise: number): number {
  return paise / PAISE;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrExact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,00,000 — Indian digit grouping, paise hidden unless they are non-zero. */
export function formatMoney(paise: number): string {
  return paise % PAISE === 0 ? inr.format(toRupees(paise)) : inrExact.format(toRupees(paise));
}

/** Compact form for dashboard tiles: ₹1.25 L, ₹3.4 Cr. */
export function formatMoneyCompact(paise: number): string {
  const r = Math.abs(toRupees(paise));
  const sign = paise < 0 ? "-" : "";
  if (r >= 1_00_00_000) return `${sign}₹${(r / 1_00_00_000).toFixed(2)} Cr`;
  if (r >= 1_00_000) return `${sign}₹${(r / 1_00_000).toFixed(2)} L`;
  if (r >= 1_000) return `${sign}₹${(r / 1_000).toFixed(1)}K`;
  return `${sign}₹${Math.round(r)}`;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Percentage of `part` within `whole`, clamped to 0-100 and safe at whole = 0. */
export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

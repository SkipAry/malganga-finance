import type { Translate } from "./i18n";

/** Date helpers. All dates are handled at local-midnight to keep due dates stable. */

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Month arithmetic that clamps to the last valid day (31 Jan + 1m = 28/29 Feb). */
export function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + months);
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, lastDay));
  return x;
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const diff = (x.getDay() + 6) % 7; // week starts Monday
  return addDays(x, -diff);
}

export function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function startOfYear(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}

/**
 * `locale` is a BCP-47 tag (see LOCALE_TAG in i18n.ts). Month names follow
 * it; digits stay Latin because mr-IN would otherwise render Devanagari
 * numerals in dates sitting beside Latin-digit money columns.
 */
export function formatDate(
  d: Date | string | null | undefined,
  locale = "en-IN",
): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(`${locale}-u-nu-latn`, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(
  d: Date | string | null | undefined,
  locale = "en-IN",
): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return `${formatDate(date, locale)}, ${date.toLocaleTimeString(`${locale}-u-nu-latn`, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** yyyy-mm-dd for <input type="date"> round-trips (local, not UTC). */
export function toInputDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

/**
 * "3 days overdue" / "due in 2 days" / "due today". Pass `t` to translate;
 * without it the English wording is used.
 */
export function dueLabel(dueDate: Date, today = new Date(), t?: Translate): string {
  const d = daysBetween(today, dueDate);
  if (!t) {
    if (d === 0) return "Due today";
    if (d > 0) return `Due in ${d} day${d === 1 ? "" : "s"}`;
    return `${-d} day${d === -1 ? "" : "s"} overdue`;
  }
  if (d === 0) return t("due.today");
  if (d > 0) return t.plural(d, "due.inDays.one", "due.inDays.other");
  return t.plural(-d, "due.lateDays.one", "due.lateDays.other");
}

/**
 * Which spelling of a person's name to show.
 *
 * Names are identity data on a lending ledger, so nothing is transliterated:
 * the Devanagari spelling only appears when a member of staff has typed it.
 * Everything falls back to the name as entered, which means a half-filled
 * book reads correctly rather than showing blanks.
 *
 * Deliberately not applied to loan codes, receipt references or shop names -
 * those are identifiers, and an identifier that changes with the interface
 * language stops being one.
 */
import type { Locale } from "./i18n";

export type Named = { name: string; nameMr?: string | null };

export function displayName(person: Named, locale: Locale): string {
  if (locale === "mr") {
    const mr = person.nameMr?.trim();
    if (mr) return mr;
  }
  return person.name;
}

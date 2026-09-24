/**
 * Runnable check for the translation machinery: `npm test`.
 *
 * Completeness is enforced by the compiler - the Marathi map is typed
 * Record<MessageKey, string>, so a missing key fails `npm run typecheck`.
 * What the compiler cannot catch is a translation that drops a placeholder:
 * "{n} हप्ते" without the {n} renders a sentence with no number in it, which
 * looks fine in review and is wrong on screen. That is what this checks.
 */
import assert from "node:assert/strict";

import { LOCALES, dictionary, format, isLocale, translator } from "./i18n";

/* ------------------------------------------------------- placeholder parity */

const placeholders = (s: string) => (s.match(/\{[a-z]+\}/gi) ?? []).sort().join(",");
const en = dictionary("en");

for (const locale of LOCALES) {
  const dict = dictionary(locale);
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    assert.equal(
      placeholders(dict[key]),
      placeholders(en[key]),
      `${locale} "${key}" must use the same placeholders as English`,
    );
    assert.ok(dict[key].trim().length > 0, `${locale} "${key}" must not be empty`);
  }
}

/* ----------------------------------------------------------- Latin numerals */

// Numbers stay English in both languages - a stated requirement, and the
// reason is practical: Devanagari digits beside Latin-digit money columns
// invite misreading when a figure is copied onto a paper receipt.
const DEVANAGARI_DIGIT = /[०-९]/;
for (const [key, text] of Object.entries(dictionary("mr"))) {
  assert.ok(!DEVANAGARI_DIGIT.test(text), `mr "${key}" uses Devanagari digits: "${text}"`);
}

/* ------------------------------------------------------------ interpolation */

assert.equal(format("{a} and {b}", { a: "x", b: "y" }), "x and y");
assert.equal(format("{n} of {n}", { n: 3 }), "3 of 3", "repeated placeholders all fill");
assert.equal(format("nothing"), "nothing", "no vars is a no-op");
assert.equal(format("{missing}", { other: 1 }), "{missing}", "unknown placeholder is left visible");

/* ------------------------------------------------------------------ plurals */

const t = translator("en");
assert.equal(t.plural(1, "tile.activeLoans.one", "tile.activeLoans.other"), "1 active loan");
assert.equal(t.plural(2, "tile.activeLoans.one", "tile.activeLoans.other"), "2 active loans");
assert.equal(t.plural(0, "tile.activeLoans.one", "tile.activeLoans.other"), "0 active loans");

const mr = translator("mr");
assert.ok(mr("nav.dashboard").length > 0);
assert.notEqual(mr("nav.customers"), t("nav.customers"), "Marathi differs from English");
assert.match(mr.plural(3, "tile.overdue.one", "tile.overdue.other"), /3/, "the count survives");

/* ------------------------------------------------------------ locale guards */

assert.ok(isLocale("en") && isLocale("mr"));
assert.ok(!isLocale("hi") && !isLocale("") && !isLocale(undefined) && !isLocale(null));
assert.equal(translator("en").locale, "en", "the translator reports its own locale");

console.log("i18n: all checks passed");

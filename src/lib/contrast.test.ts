/**
 * Runnable check that the design tokens stay readable: `npm test`.
 *
 * Reads the real values out of globals.css rather than a copy, so editing a
 * colour there is what this tests. Twice now a palette change has looked fine
 * as swatches and failed at chip size, where the text sits on a 12% tint of
 * itself rather than on the card - that pairing is the one that keeps
 * breaking, so it is checked explicitly.
 *
 * Thresholds are WCAG 2.1: 4.5:1 for body text (1.4.3), 3:1 for focus
 * indicators against adjacent colour (1.4.11).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** Reads a custom property from a given selector block. */
function token(selector: string, name: string): string {
  const block = css.slice(css.indexOf(selector));
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `${name} not found under ${selector}`);
  return match![1].toLowerCase();
}

function channels(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Reproduces `color-mix(in srgb, tone 12%, surface)` from the .tone-chip rule. */
function chipBackground(tone: string, surface: string): string {
  const [t, s] = [channels(tone), channels(surface)];
  return (
    "#" +
    t.map((v, i) => Math.round(v * 0.12 + s[i] * 0.88).toString(16).padStart(2, "0")).join("")
  );
}

const LIGHT = ":root {";
const DARK = ':root[data-theme="dark"]';

type Check = { label: string; fg: string; bg: string; min: number };
const checks: Check[] = [];

for (const [theme, selector] of [["light", LIGHT], ["dark", DARK]] as const) {
  const elev = token(selector, "--bg-elev");
  const sunken = token(selector, "--bg-sunken");

  for (const name of ["--text", "--text-muted", "--text-faint"]) {
    checks.push({ label: `${theme} ${name} on card`, fg: token(selector, name), bg: elev, min: 4.5 });
  }
  // The row-hover surface: --text-faint has failed here before.
  checks.push({
    label: `${theme} --text-faint on row hover`,
    fg: token(selector, "--text-faint"),
    bg: sunken,
    min: 4.5,
  });

  for (const tone of ["--tone-money", "--tone-warn", "--tone-risk", "--tone-brand"]) {
    const fg = token(selector, tone);
    checks.push({ label: `${theme} ${tone} on card`, fg, bg: elev, min: 4.5 });
    checks.push({ label: `${theme} ${tone} chip`, fg, bg: chipBackground(fg, elev), min: 4.5 });
  }

  // Chart lines are graphical objects, so 3:1 (WCAG 1.4.11) rather than 4.5.
  for (const series of ["--chart-collected", "--chart-disbursed", "--chart-expenses"]) {
    checks.push({ label: `${theme} ${series} line on card`, fg: token(selector, series), bg: elev, min: 3 });
  }

  checks.push({
    label: `${theme} sidebar text on sidebar`,
    fg: token(selector, "--sidebar-text"),
    bg: token(selector, "--sidebar"),
    min: 4.5,
  });
}

let failures = 0;
for (const { label, fg, bg, min } of checks) {
  const r = ratio(fg, bg);
  if (r < min) {
    failures++;
    console.log(`  FAIL  ${label} — ${r.toFixed(2)}:1 on ${bg} (needs ${min})`);
  }
}

assert.equal(failures, 0, `${failures} colour pair(s) below the WCAG threshold`);
console.log(`contrast: all ${checks.length} colour pairs pass`);

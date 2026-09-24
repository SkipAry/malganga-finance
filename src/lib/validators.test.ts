/**
 * Runnable check that Marathi phone-keyboard input survives the forms:
 * `npm test`.
 *
 * Each case here failed before cleanInput existed: a Devanagari-digit phone
 * number or amount was rejected outright, and the same visible word typed on
 * two different keyboards was stored as two different strings.
 */
import assert from "node:assert/strict";

import { cleanInput, customerSchema, phone, rupees } from "./validators";

const DEVANAGARI_PHONE = "९८२२०११००१"; // ९८२२०११००१
const DEVANAGARI_AMOUNT = "७,०००"; // ७,०००

/* ------------------------------------------------------- Devanagari digits */

assert.equal(cleanInput("०१२३४५६७८९"), "0123456789");

const p = phone.safeParse(DEVANAGARI_PHONE);
assert.ok(p.success, "a phone number typed on a Marathi keyboard must be accepted");
assert.equal(p.data, "9822011001", "and stored with Latin digits");

const r = rupees.safeParse(DEVANAGARI_AMOUNT);
assert.ok(r.success, "an amount typed on a Marathi keyboard must be accepted");
assert.equal(r.data, 700000, "and parse to the same paise as 7,000");

// Mixed input, as happens when an agent switches keyboard mid-number.
assert.equal(phone.parse("98२२011001"), "9822011001");

// Still rejects what is genuinely not a number.
assert.ok(!phone.safeParse("कखग").success, "letters are still not a phone number");
assert.ok(!rupees.safeParse("कख").success, "letters are still not an amount");

/* ----------------------------------------------------------- normalisation */

const precomposed = "क़लम"; // क़लम, nukta letter as one code point
const decomposed = "क़लम"; // क + nukta + लम
assert.notEqual(precomposed, decomposed, "precondition: the raw strings differ");
assert.equal(cleanInput(precomposed), cleanInput(decomposed), "two keyboards, one stored word");

const n1 = customerSchema.shape.name.parse(precomposed);
const n2 = customerSchema.shape.name.parse(decomposed);
assert.equal(n1, n2, "the name field normalises too, so search and duplicates agree");

// Marathi's eyelash ra is written with a zero-width joiner. Normalising must
// not strip it - that would change the letterform a customer's name uses.
const eyelash = "र्‍य";
assert.ok(cleanInput(eyelash).includes("‍"), "ZWJ survives");

/* -------------------------------------------------------------- unchanged */

assert.equal(cleanInput("Udit Garud"), "Udit Garud", "Latin text passes through untouched");
assert.equal(cleanInput("उदित गरूड"), "उदित गरूड");

console.log("validators: all checks passed");

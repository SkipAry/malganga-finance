/**
 * Runnable check for reminder text and WhatsApp links: `npm test`.
 *
 * Two things matter here. The message must never carry the amount - these
 * land on a phone anyone can pick up. And the link must refuse a number it
 * cannot read rather than guess, because a wrong guess opens a chat with a
 * stranger and shows them a customer's name and loan number.
 */
import assert from "node:assert/strict";

import { reminderMessage, toWhatsappNumber, whatsappLink } from "./notify";

const inst = { id: "i1", seq: 7, dueDate: new Date(2026, 0, 8), totalPaise: 700000 };
const ctx = { loanId: "l1", loanCode: "LN-0042", customerId: "c1", customerName: "Mahesh Kulkarni" };

/* ------------------------------------------------------------- the message */

for (const kind of ["BEFORE_DUE", "ON_DUE", "OVERDUE"] as const) {
  const text = reminderMessage(kind, inst, ctx);
  assert.ok(text.includes("LN-0042"), `${kind} should name the loan`);
  assert.ok(text.includes("Mahesh"), `${kind} should greet the customer`);
  assert.ok(text.includes("7"), `${kind} should name the EMI number`);

  // The amount is 7000 rupees / 700000 paise. None of it may appear, in any
  // format the money formatter might produce.
  for (const leak of ["7,000", "7000", "700000", "₹"]) {
    assert.ok(!text.includes(leak), `${kind} must not disclose the amount (found "${leak}")`);
  }
}

/* --------------------------------------------------------- number handling */

assert.equal(toWhatsappNumber("9822011001"), "919822011001", "bare 10-digit mobile");
assert.equal(toWhatsappNumber("+91 98220 11001"), "919822011001", "spaces and plus");
assert.equal(toWhatsappNumber("098220-11001"), "919822011001", "leading zero and dash");
assert.equal(toWhatsappNumber("919822011001"), "919822011001", "already prefixed");

// Anything unreadable must be refused, not repaired into a plausible number.
assert.equal(toWhatsappNumber(""), null, "empty");
assert.equal(toWhatsappNumber("12345"), null, "too short");
assert.equal(toWhatsappNumber("98220110012345"), null, "too long");
assert.equal(toWhatsappNumber("not a phone"), null, "no digits");

/* ------------------------------------------------------------------- links */

const link = whatsappLink("9822011001", reminderMessage("ON_DUE", inst, ctx));
assert.ok(link?.startsWith("https://wa.me/919822011001?text="), "link targets the right number");
assert.ok(!link?.includes(" "), "message is URL-encoded");
assert.ok(decodeURIComponent(link!.split("?text=")[1]).includes("LN-0042"), "text survives encoding");
assert.equal(whatsappLink("12345", "hi"), null, "no link for an unusable number");

console.log("notify: all checks passed");

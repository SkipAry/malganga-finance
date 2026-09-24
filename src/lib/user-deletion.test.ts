/**
 * Runnable check for the user-deletion guards: `npm test`.
 *
 * These decide whether a login can be destroyed. Every refusal below exists
 * because the alternative loses something that cannot be rebuilt - the name
 * on a payment, or the last way into the system.
 */
import assert from "node:assert/strict";

import { linkedRecordCount, userDeletionBlocker } from "./user-deletion";

const clean = {
  isSelf: false,
  isLastActiveAdmin: false,
  auditEntries: 0,
  paymentsRecorded: 0,
  expensesRecorded: 0,
};

/* ------------------------------------------------------------- the one yes */

assert.equal(userDeletionBlocker(clean), null, "an unused login may be deleted");

/* ------------------------------------------------------------- the refusals */

assert.match(
  userDeletionBlocker({ ...clean, isSelf: true }) ?? "",
  /your own login/,
  "nobody deletes themselves out of the system",
);

assert.match(
  userDeletionBlocker({ ...clean, isLastActiveAdmin: true }) ?? "",
  /one active administrator/,
  "the last admin is never removable",
);

// Each kind of history counts on its own - a login named on one payment and
// nothing else must still be refused.
for (const field of ["auditEntries", "paymentsRecorded", "expensesRecorded"] as const) {
  const blocker = userDeletionBlocker({ ...clean, [field]: 1 });
  assert.match(blocker ?? "", /named on 1 record\b/, `${field} alone must block deletion`);
  assert.ok(blocker?.includes("Disable it instead"), `${field} refusal should say what to do`);
}

/* ----------------------------------------------------------------- details */

assert.equal(
  linkedRecordCount({ ...clean, auditEntries: 2, paymentsRecorded: 3, expensesRecorded: 4 }),
  9,
  "history is the sum of all three sources",
);

assert.match(
  userDeletionBlocker({ ...clean, paymentsRecorded: 2 }) ?? "",
  /named on 2 records\b/,
  "plural reads correctly",
);

// Ordering matters: self-deletion is reported before history, so an admin
// deleting themselves is told the real reason rather than a record count.
assert.match(
  userDeletionBlocker({ ...clean, isSelf: true, auditEntries: 50 }) ?? "",
  /your own login/,
  "identity checks come before history checks",
);

console.log("user-deletion: all checks passed");

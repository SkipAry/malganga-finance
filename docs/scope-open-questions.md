# Scope section 5 — open questions and what was assumed

Status of the twelve confirmations requested in the scope document, and the
assumption the build currently runs on. Each assumption is reversible; the
"where" column names the single place to change it.

## Blocking — decide before go-live

### 1. The worked example earns the lender nothing (scope item 4)

Section 4.1 says the first EMI is deducted at disbursement and "the remaining 13
EMIs are then collected". Taken literally on the stated numbers:

| | |
|---|---|
| Loan amount | ₹1,00,000 |
| Schedule | 13 × ₹7,000 + 1 × ₹9,000 = ₹1,00,000 |
| Withheld at disbursement | ₹7,000 |
| Cash to customer | ₹93,000 |
| Collected (13 remaining EMIs) | ₹93,000 |
| **Lender margin** | **₹0** |

Pay out ₹93,000, collect ₹93,000. The stated 3%/month never appears.

The only reading of the same example that produces a return treats the withheld
EMI as an **upfront charge** and still collects all 14 installments:

| | |
|---|---|
| Cash to customer | ₹93,000 |
| Collected (14 EMIs) | ₹1,00,000 |
| **Lender margin** | **₹7,000 — about 2.33% per month on the cash advanced** |

2.33% is close to the 3% quoted, so this is almost certainly the intent.

**Assumed:** the second reading (`EXTRA_CHARGE`) is the default. Both are
selectable per loan, and the loan form shows the resulting margin and effective
rate live, with a red warning whenever a configuration would earn nothing.

**Still needed:** the general rule for any amount and tenure. The current rule
reproduces the example exactly — EMI = loan amount ÷ tenure, rounded **down** to
the nearest ₹500, with the remainder loaded onto the final EMI (₹1,00,000 ÷ 14 =
₹7,142 → ₹7,000; final = ₹9,000). Confirm the rounding step and whether the
remainder belongs on the last EMI or the first.

*Where:* `src/lib/emi.ts` (`buildSchedule`, `DEFAULT_ROUNDING_PAISE`),
`src/lib/enums.ts` (`UPFRONT_MODES`).

### 7. Notification channel and gateway

**Assumed:** SMS. Messages are composed, queued, scheduled and cancelled
correctly, but delivery writes to the server log — nothing reaches customers
until a provider is supplied.

*Where:* `dispatcher` in `src/lib/notify.ts` — one function, one signature.

## Non-blocking — assumption stated, easily changed

| # | Question | Assumed | Where |
|---|---|---|---|
| 1 | Which KYC documents | Aadhaar, PAN, Voter ID, Driving licence, Passport, plus Shop Act and photographs | `DOCUMENT_KINDS` in `src/lib/enums.ts` |
| 2 | Is collateral mandatory | No — recorded when present, never enforced | `src/actions/customers.ts` |
| 3 | Multiple referrers per customer | One referrer (name, contact, relationship) | `Customer` model |
| 5 | Is 3%/month fixed | Per-loan, defaulting to 3% | loan form field |
| 6 | Trace investor funds to loans | No — capital is pooled | would need a new join table |
| 8 | Overdue reminder cadence | Repeats every 3 days until paid | `OVERDUE_REPEAT_DAYS` in `src/lib/notify.ts` |
| 9 | Separate field/collection agent role | Built — Collection agent can record payments, customers, loans and expenses, but not investors, users, reports or reversals | `src/components/nav-items.ts`, guards in `src/lib/session.ts` |
| 10 | Expense approval step | No — straight to the ledger | `src/actions/operations.ts` |
| 11 | Report export formats | On-screen, print, and CSV (opens in Excel). No PDF generator | `src/app/api/export/route.ts` |
| 12 | Multiple branches | Single branch, per the scope's own v1 assumption | would need a `branchId` across most tables |

## Confirmed out of scope for v1

Carried over unchanged from section 6: no payment-gateway or bank
reconciliation, no loan write-off / NPA workflow, one-way notifications only,
all amounts in INR.

## Beyond the document

Two additions the scope does not mention, included because the modules it does
specify are not usable without them:

- **Collections worklist** — everything overdue plus what falls due next, oldest
  first, with one click to the receipt form. The scope specifies reminders and
  manual payment entry but no screen that connects them.
- **Audit log** — who created, changed, reversed or waived what. Cash-handling
  software with several staff logins needs this, and it is what makes soft
  deletion meaningful.

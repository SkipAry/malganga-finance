# System architecture

## Shape

A single Next.js application. Pages are React Server Components that query the
database directly; every mutation is a server action. There is no separate API
tier and no client-side data layer — the only route handlers are CSV export and
logout.

```
browser
  │  form submit / link
  ▼
server action ──► zod schema ──► guard (role) ──► service ──► Prisma ──► SQLite
  │                                                  │
  │                                            audit log row
  ▼
revalidatePath ──► RSC re-render
```

## Modules

| Path | Responsibility |
|---|---|
| `src/lib/emi.ts` | Schedule generation and disbursement economics. Pure, no I/O. |
| `src/lib/loan-service.ts` | Disbursement, payment allocation, reversal, derived state. Takes a Prisma transaction client so callers control the boundary. |
| `src/lib/reports.ts` | Read-side aggregation for dashboard and reports. |
| `src/lib/notify.ts` | Reminder text, scheduling, dispatcher seam. |
| `src/lib/session.ts` | Cookie sessions, role guards, audit log. |
| `src/lib/validators.ts` | Zod schemas — the only place raw form input becomes typed data. |
| `src/actions/*` | Thin: parse, guard, call a service, revalidate. No business rules. |

Business logic lives in `lib`, not in actions or components, so the seed script
and the app disburse loans and allocate payments through exactly the same code.

## Data model decisions

**Money is `Int` paise.** Floats cannot represent ₹0.01 reliably and an EMI
split that loses a paisa per row loses real money over a book. Conversion
happens only in `src/lib/money.ts`.

**No SQL enums.** SQLite has none, so enum-like columns are `String` and the
allowed values live in `src/lib/enums.ts`, enforced by zod at the boundary. A
Postgres migration can promote them later without touching call sites.

**Overdue is not a column.** Storing it would require a scheduled job and would
be wrong between runs. `isOverdue()` derives it from the due date and paid
amount at read time.

**The schedule is materialised, the status is not.** Installment rows are
written once at disbursement (amounts and due dates are a contract with the
customer and must not drift if a rate changes later). Paid amounts and statuses
are updated as receipts land.

## Payment allocation

A receipt applies to the named installment first, then flows to the oldest
still-open installments. Surplus beyond the schedule is recorded on the payment
and reported back to the user rather than silently absorbed.

Reversal resets the loan's installments and replays the remaining receipts in
date order. Replaying is cheaper to reason about — and safer — than trying to
un-pick one historical allocation, and the loan's open/closed status is
recomputed afterwards.

## Authentication

A signed, httpOnly, SameSite=Lax JWT cookie, 12-hour expiry, verified on every
read. `AUTH_SECRET` must be at least 32 characters or the app throws at startup
rather than falling back to a default.

Login compares a bcrypt hash whether or not the email exists, so a wrong email
and a wrong password are indistinguishable in both response and timing.

Three roles, enforced server-side by `requireStaff` / `requireAdmin` (redirect,
for pages) and `assertStaff` / `assertAdmin` (throw, for actions). Navigation
filtering is cosmetic; the guards are the boundary. An investor session carries
an `investorId` and the portfolio page reads only that record.

## Known limits

- **SQLite.** Fine for a single-branch office. Concurrent writers are
  serialised; move to Postgres before multi-branch or heavy concurrent use. The
  Prisma schema needs only a provider change plus enum promotion.
- **Documents are base64 in the database**, capped at 4 MB. Simple and
  backed-up-with-everything-else, but it will bloat the file; move to object
  storage when scans become routine.
- **Reminder dispatch is manual**, triggered from the Reminders screen. Point a
  cron or scheduled task at `dispatchDueReminders` once the gateway is chosen.
- **No PDF generation.** Reports print from the browser and export as CSV.

# Malganga Finance

Loan management and financing platform — customer onboarding, disbursement, EMI
collection, investor capital, expenses and reporting.

Built to the functional scope in *Malganga Finance — Functional Scope & Approval
Document v1.0 (15 September 2026)*.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, server actions) |
| Language | TypeScript, strict |
| Database | SQLite via Prisma 6 |
| Styling | Tailwind CSS v4, own component primitives |
| Charts | Recharts |
| Auth | Signed httpOnly JWT cookie (`jose`) + bcrypt |

No UI kit, no auth library, no state manager — the app is server-rendered and
mutations go through server actions.

## Getting started

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Then open http://localhost:3000.

Demo sign-ins (created by the seed, development only):

| Role | Email | Password |
|---|---|---|
| Administrator | admin@malganga.in | Admin@12345 |
| Collection agent | agent@malganga.in | Agent@12345 |
| Investor | investor@malganga.in | Invest@12345 |

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Serve the production build |
| `npm test` | EMI engine and money checks |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Apply `schema.prisma` to the database |
| `npm run db:seed` | Load demo data (clears existing rows first) |
| `npm run db:reset` | Drop and rebuild, then seed |

## Configuration

`.env` (see `.env.example`):

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="at least 32 characters"
```

`AUTH_SECRET` is required and validated at runtime — generate a real one for any
deployment (`openssl rand -base64 32`). Sessions last 12 hours.

## Layout

```
prisma/
  schema.prisma        data model (money stored as integer paise)
  seed.ts              demo book: loans at various stages, overdue EMIs
src/
  actions/             server actions, one file per domain
  app/
    (app)/             authenticated shell + all screens
    login/             sign-in
    api/export/        CSV export (admin only)
  components/          app shell, primitives, forms, chart
  lib/
    emi.ts             EMI schedule engine  <- the business core
    emi.test.ts        runnable checks for it
    loan-service.ts    disbursement, payment allocation, derived state
    reports.ts         dashboard and report aggregations
    notify.ts          reminder composition + dispatcher seam
    session.ts         auth guards and audit log
    validators.ts      zod schemas at the trust boundary
```

## Things worth knowing

**Money is integer paise everywhere.** Rupees exist only at the UI boundary
(`src/lib/money.ts`). EMI splits reconcile to the paisa; `npm test` asserts this
across awkward amounts and tenures.

**Overdue is derived, never stored.** An installment is overdue if it is unpaid
and its due date has passed, computed at read time — so the figures are correct
without a nightly job.

**Reminders are queued but not delivered.** Composition, scheduling, cancellation
on payment and repeat-while-overdue all work; delivery writes to the server log.
Swap `dispatcher` in `src/lib/notify.ts` for a real SMS/WhatsApp gateway — that
function signature is the only integration point.

**Roles.** Administrator (everything), Collection agent (customers, loans,
payments, expenses — no investors, users, reports or reversals), Investor
(read-only, own records only). Enforced server-side on every page and action,
not just hidden in the nav.

**Deletions are soft where the ledger depends on them.** A customer or investor
with history is deactivated; only records with no history are hard-deleted.
Reversing a receipt rebuilds the affected schedule by replaying what remains.

## Open scope questions

Twelve points in section 5 of the scope document are unanswered, and one of them
changes the economics of every loan. See
[docs/scope-open-questions.md](docs/scope-open-questions.md) before sign-off.

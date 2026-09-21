# Deployment

Database on Supabase Postgres, application on Vercel. Supabase does not run
Next.js, so the two are separate.

## Supabase project

| | |
|---|---|
| Project | `malganga-finance` |
| Reference | `kqqypvgmozcztcbrdqdn` |
| Region | `ap-south-1` (Mumbai) |
| Postgres | 17 |
| Cost | ₹0/month on the current plan |

Mumbai keeps latency low for Pune-based staff and keeps customer financial data
in India.

### Row Level Security

RLS is **enabled on all 13 tables with no policies**, which is deliberate.

Supabase publishes every table in `public` over PostgREST to the `anon` and
`authenticated` roles, and the anon key is designed to be public. With RLS off,
anyone holding that key could read or write the entire ledger — KYC numbers,
phone numbers, document scans, payments.

This application never uses the Supabase client or the anon key. It reaches
Postgres through Prisma as the table-owning `postgres` role, which bypasses
RLS. Deny-all RLS therefore closes the REST surface and leaves the app
untouched.

The Supabase linter will report 13 INFO-level "RLS enabled, no policy" notices.
That is the intended state, not an outstanding problem. **Do not "fix" them by
adding permissive policies** — that would reopen the REST surface.

Application authorisation (admin / agent / investor) lives in
`src/lib/session.ts`, enforced on every page and server action. RLS is the
outer perimeter, not a substitute.

## Environment variables

Both connection strings come from **Supabase dashboard → Project Settings →
Database → Connection string**.

| Variable | Value | Used by |
|---|---|---|
| `DATABASE_URL` | Transaction pooler, port **6543**, with `?pgbouncer=true&connection_limit=10&pool_timeout=20` | The running app |
| `DIRECT_URL` | Direct connection, port **5432** | `prisma migrate` only |
| `AUTH_SECRET` | `openssl rand -base64 32` | Session signing |

Percent-encode special characters in the password. A `#` must be written
`%23`, `@` as `%40`, `/` as `%2F`. A raw `#` is the nasty one: it opens a URL
fragment in the middle of the connection string, so everything after it —
including the host and port — is discarded and Prisma reports a protocol error
that points nowhere near the real cause. Run `npm run db:check` to catch this
and the other common paste mistakes before deploying.

The pooler matters on Vercel: serverless functions open many short-lived
connections and would exhaust direct Postgres slots. Migrations cannot run
through PgBouncer, hence the second URL.

Do **not** set `connection_limit=1` here. That advice applies to a direct
Postgres connection, where each serverless instance must hold at most one slot.
Through PgBouncer the pooling already happens server-side, so a limit of 1 only
starves Prisma: the dashboard issues about ten aggregates concurrently, they
serialise behind the single connection, and the request dies with
"Timed out fetching a new connection from the connection pool" — which reads
like a database outage and is in fact self-inflicted.

Use a **different `AUTH_SECRET` per environment**. Sharing one means a session
cookie minted in preview is valid in production.

## Deploying to Vercel

```bash
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add DIRECT_URL production
npx vercel env add AUTH_SECRET production
npx vercel --prod
```

Build command is the default `npm run build`, which runs `prisma generate`
first. Nothing else is needed — no `vercel.json`.

### Schema changes

Migrations are **not** run during the Vercel build. On a ledger, schema changes
should be a deliberate act, not a side effect of a deploy:

```bash
npm run db:deploy      # prisma migrate deploy, against DIRECT_URL
```

Run it before the deploy that needs it. To create a new migration locally:

```bash
npm run db:migrate     # prisma migrate dev
```

## First administrator

Do **not** run `npm run db:seed` against a deployment. It deletes every row and
creates logins whose passwords are published in the README. The script now
refuses to run against a non-local `DATABASE_URL` unless
`ALLOW_DESTRUCTIVE_SEED=yes` is set.

Bootstrap the real first admin instead:

```bash
ADMIN_EMAIL="owner@malganga.in" \
ADMIN_NAME="Anil Malganga" \
ADMIN_PASSWORD='<long unique password>' \
npm run create:admin
```

It inserts or updates exactly one row, deletes nothing, hashes with bcrypt cost
12, and records the action in the audit log. Everyone else is created from
**Users & roles** inside the app.

## Backups

Supabase takes daily backups on paid plans; the free plan does not. Before this
holds real customer money, either move to a paid plan or schedule
`pg_dump` against `DIRECT_URL`. A lending ledger with no backup is a
single hardware fault away from being unreconstructable.

## Limits worth knowing

- **Free-plan projects pause after ~1 week of inactivity.** Fine during
  development; a paused database means an app that cannot serve. Upgrade before
  handing this to staff.
- **Money is `Int` (paise)**, so one row caps near ₹2.14 crore. Aggregates are
  summed by Postgres as `bigint` and do not overflow. Move the columns to
  `BigInt` if single loans ever approach that.
- **KYC scans are base64 in the `Document` table**, capped at 3 MB each.

  The cap is driven by Vercel, not by us: a function request body cannot exceed
  4.5 MB, and that is an infrastructure limit no `bodySizeLimit` setting can
  raise. 3 MB leaves room for multipart overhead so an oversized file gets the
  app's own error rather than an opaque 413.

  This will bite in the field. Phone cameras routinely produce 3-6 MB photos,
  so agents will hit the limit photographing an Aadhaar card. Two fixes, in
  order of effort:

  1. **Downscale in the browser before upload** (canvas resize to ~1600px,
     JPEG q0.8). Turns a 5 MB photo into a few hundred KB, uploads far faster
     on a field connection, and shrinks the database. Self-contained.
  2. **Upload straight to Supabase Storage** from the browser and keep only the
     object key in Postgres. Removes the limit entirely and stops the database
     carrying binary data. The better long-term answer.

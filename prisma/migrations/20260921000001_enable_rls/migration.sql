-- Supabase exposes every table in `public` over PostgREST to the anon and
-- authenticated roles. This application does not use the Supabase client at
-- all: it reaches Postgres through Prisma as the table-owning `postgres` role,
-- which bypasses RLS. Enabling RLS with no policies therefore closes the REST
-- surface without affecting the app.
--
-- Application authorisation lives in src/lib/session.ts (role guards on every
-- page and server action). This is the outer perimeter, not a replacement.
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Collateral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Loan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Installment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Investor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InvestorTxn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Setting" ENABLE ROW LEVEL SECURITY;

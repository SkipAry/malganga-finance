import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { Card } from "@/components/ui/primitives";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "INVESTOR" ? "/portfolio" : "/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — hidden on small screens where it would only push the form down. */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{ background: "linear-gradient(150deg,#0f1621 0%,#152238 55%,#1d3ed8 190%)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white"
            style={{ background: "linear-gradient(140deg,var(--color-brand-500),var(--color-brand-700))" }}
            aria-hidden
          >
            M
          </span>
          <span className="text-lg font-semibold text-white">Malganga Finance</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-[-0.025em] text-white">
            Every loan, EMI and rupee — in one ledger.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/60">
            Customer onboarding, disbursement, EMI collection, investor capital and
            day-to-day expenses, tracked end to end.
          </p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {[
              ["Schedules", "Auto-generated"],
              ["Reminders", "Before · on · after due"],
              ["Books", "Weekly · monthly · yearly"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-2xs uppercase tracking-[0.08em] text-white/40">{k}</dt>
                <dd className="mt-1 text-sm font-medium text-white/85">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-xs text-white/35">
          Authorised access only. All activity is recorded.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span
              className="grid h-11 w-11 place-items-center rounded-xl text-lg font-bold text-white"
              style={{ background: "linear-gradient(140deg,var(--color-brand-500),var(--color-brand-700))" }}
              aria-hidden
            >
              M
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Sign in</h1>
          <p className="mt-1 mb-7 text-base" style={{ color: "var(--text-muted)" }}>
            Use the credentials issued by your administrator.
          </p>

          <LoginForm />

          {process.env.NODE_ENV !== "production" ? (
            <Card className="mt-8 p-4 text-sm" style={{ background: "var(--bg-sunken)" }}>
              <p className="font-semibold">Demo sign-ins</p>
              <ul className="mt-1.5 space-y-0.5" style={{ color: "var(--text-muted)" }}>
                <li>admin@malganga.in · Admin@12345</li>
                <li>agent@malganga.in · Agent@12345</li>
                <li>investor@malganga.in · Invest@12345</li>
              </ul>
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  );
}

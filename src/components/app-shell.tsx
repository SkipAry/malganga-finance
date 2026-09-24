"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavIcon } from "./nav-icon";
import { navFor, type NavItem } from "./nav-items";
import { cx } from "./ui/primitives";
import { type Role } from "@/lib/enums";
import { translator, type Locale, type MessageKey } from "@/lib/i18n";
import { LanguageToggle } from "./language-toggle";

type ShellUser = { name: string; email: string; role: Role };

type T = ReturnType<typeof translator>;

function groupBy(items: NavItem[]): Array<[string, NavItem[]]> {
  const map = new Map<string, NavItem[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return [...map.entries()];
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark({ t }: { t: T }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span
        className="grid h-8 w-8 place-items-center rounded-lg text-lg font-bold text-white"
        style={{ background: "linear-gradient(140deg,var(--color-brand-500),var(--color-brand-700))" }}
        aria-hidden
      >
        M
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold leading-tight text-white">
          Malganga Finance
        </span>
        <span className="block text-2xs leading-tight" style={{ color: "var(--sidebar-text)" }}>
          {t("app.tagline")}
        </span>
      </span>
    </Link>
  );
}

function ThemeToggle({ t }: { t: T }) {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem("mg-theme");
      } catch {
        return null;
      }
    })();
    const initial =
      stored === "dark" || stored === "light"
        ? (stored as "light" | "dark")
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mg-theme", next);
    } catch {
      /* private mode — the toggle still works for this session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="tap-square grid h-9 w-9 place-items-center rounded-lg border transition-colors hover:bg-[var(--bg-sunken)]"
      aria-label={theme === "dark" ? t("app.themeToLight") : t("app.themeToDark")}
      title={theme === "dark" ? t("app.themeLight") : t("app.themeDark")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[17px] w-[17px]">
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" strokeLinecap="round" />
          </>
        ) : (
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.7 6.7 0 0 0 10.5 10.5z" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

export function AppShell({
  user,
  locale,
  children,
}: {
  user: ShellUser;
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = translator(locale);
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const groups = groupBy(navFor(user.role));

  // Any navigation closes the mobile drawer.
  React.useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {groups.map(([group, items]) => (
        <div key={group}>
          <p
            className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-[0.1em]"
            style={{ color: "var(--sidebar-text)", opacity: 0.6 }}
          >
            {t(`nav.group.${group}` as MessageKey)}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "tap flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "font-medium text-white" : "hover:text-white",
                    )}
                    style={{
                      background: active ? "var(--sidebar-active)" : undefined,
                      color: active ? "#fff" : "var(--sidebar-text)",
                    }}
                  >
                    <NavIcon name={item.icon} />
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col lg:flex"
        style={{ background: "var(--sidebar)" }}
      >
        <div className="flex h-16 items-center border-b border-white/[0.06]">
          <Wordmark t={t} />
        </div>
        {nav}
        <div className="border-t border-white/[0.06] px-4 py-3">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs" style={{ color: "var(--sidebar-text)" }}>
            {t(`role.${user.role}` as MessageKey)}
          </p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label={t("app.closeMenu")}
            onClick={() => setOpen(false)}
          />
          <aside
            className="animate-rise absolute inset-y-0 left-0 flex w-64 flex-col"
            style={{ background: "var(--sidebar)" }}
          >
            <div className="flex h-16 items-center border-b border-white/[0.06]">
              <Wordmark t={t} />
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header
          className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6"
          style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tap-square grid h-9 w-9 place-items-center rounded-lg border lg:hidden"
            aria-label={t("app.openMenu")}
          >
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" fill="none" className="h-[18px] w-[18px]">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>

          <div className="min-w-0 flex-1" />

          <ThemeToggle t={t} />
          <LanguageToggle current={locale} label={t("app.language")} />

          <div className="flex items-center gap-2.5 border-l pl-3">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold"
              style={{ background: "var(--bg-sunken)", color: "var(--text-muted)" }}
              aria-hidden
            >
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
              <p className="truncate text-xs leading-tight" style={{ color: "var(--text-faint)" }}>
                {t(`role.${user.role}` as MessageKey)}
              </p>
            </div>
            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="tap rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-[var(--bg-sunken)]"
                style={{ color: "var(--text-muted)" }}
              >
                {t("app.signOut")}
              </button>
            </form>
          </div>
        </header>

        <main className="animate-rise mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

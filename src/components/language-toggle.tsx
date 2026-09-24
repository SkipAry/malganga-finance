"use client";

import { setLocale } from "@/actions/locale";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n";
import { cx } from "./ui/primitives";

/**
 * Two buttons rather than a dropdown: with exactly two languages, a select
 * costs a tap to open and hides the alternative. Each language is named in
 * its own script, so someone who cannot read the current one can still find
 * their way out.
 *
 * Plain forms posting a server action - it works before hydration, which
 * matters on the slow connections this is used on.
 */
export function LanguageToggle({ current, label }: { current: Locale; label: string }) {
  return (
    <div
      className="flex items-center rounded-lg border p-0.5"
      role="group"
      aria-label={label}
    >
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <form key={locale} action={setLocale}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              aria-current={active ? "true" : undefined}
              className={cx(
                "tap rounded-[7px] px-2.5 py-1 text-xs font-medium transition-colors",
                active ? "text-white" : "hover:bg-[var(--bg-sunken)]",
              )}
              style={
                active
                  ? { background: "var(--tone-brand)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {LOCALE_LABEL[locale]}
            </button>
          </form>
        );
      })}
    </div>
  );
}

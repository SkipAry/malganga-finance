import Link from "next/link";

import { cx } from "./ui/primitives";

export type FilterOption = {
  value: string;
  label: string;
  /** Optional trailing tally, e.g. the number queued under each status. */
  count?: number;
};

/**
 * The list-filter control used above tables and in page headers.
 *
 * These are navigation links, not ARIA tabs (there is no tabpanel — each
 * option is a separate server-rendered URL), so the selected one is marked
 * with aria-current rather than role="tab".
 *
 * Every other query parameter is carried across, so switching a filter never
 * silently drops an active search term.
 */
export function FilterTabs({
  basePath,
  param,
  value,
  options,
  searchParams = {},
  variant = "plain",
}: {
  basePath: string;
  /** Query parameter this control writes, e.g. "status". */
  param: string;
  /** Currently selected value. */
  value: string;
  options: FilterOption[];
  /** The page's resolved searchParams, so other filters survive a click. */
  searchParams?: Record<string, string | undefined>;
  /** "bordered" for page headers, "plain" inside a card toolbar. */
  variant?: "plain" | "bordered";
}) {
  function hrefFor(next: string): string {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(searchParams)) {
      if (val && key !== param) query.set(key, val);
    }
    query.set(param, next);
    return `${basePath}?${query.toString()}`;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-lg px-3 py-1.5 text-[13px] transition-colors",
              variant === "bordered" && "border",
              active ? "font-medium" : "hover:bg-[var(--bg-sunken)]",
            )}
            style={active ? { background: "var(--bg-sunken)" } : { color: "var(--text-muted)" }}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className="ml-1.5 text-[12px]" style={{ color: "var(--text-faint)" }}>
                {option.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

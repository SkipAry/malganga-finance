"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Spinner } from "./form-parts";

/**
 * Debounced URL-backed search. Keeping the term in the query string means the
 * list stays server-rendered and a filtered view is shareable.
 */
export function SearchBar({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (value === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      startTransition(() => router.replace(`?${next.toString()}`, { scroll: false }));
    }, 250);

    return () => clearTimeout(timer);
  }, [value, params, router]);

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="pointer-events-none absolute left-3 top-1/2 h-[16px] w-[16px] -translate-y-1/2"
        style={{ color: "var(--text-faint)" }}
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9.5 w-full rounded-lg border bg-[var(--bg-elev)] pl-9 pr-9 text-[14px] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-brand-500"
      />
      {pending ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }}>
          <Spinner />
        </span>
      ) : null}
    </div>
  );
}

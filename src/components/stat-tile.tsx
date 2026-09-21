import * as React from "react";
import Link from "next/link";

import { Card, cx } from "./ui/primitives";

type Tone = "neutral" | "money" | "warn" | "risk" | "brand";

const accent: Record<Tone, string> = {
  neutral: "var(--text-muted)",
  money: "var(--tone-money)",
  warn: "var(--tone-warn)",
  risk: "var(--tone-risk)",
  brand: "var(--tone-brand)",
};

/**
 * Glyph per tone. Colour must never be the only carrier of meaning
 * (WCAG 1.4.1), so a tile that reads "bad" in red also reads "bad" in shape
 * and in words.
 */
const GLYPH: Record<Tone, React.ReactNode> = {
  risk: <path d="M8 1.6 15 14H1L8 1.6ZM8 6v4M8 12.2v.1" />,
  warn: <><circle cx="8" cy="8" r="6.4" /><path d="M8 4.6V8l2.4 1.6" /></>,
  money: <><circle cx="8" cy="8" r="6.4" /><path d="m5.3 8.2 1.9 1.9 3.5-3.9" /></>,
  brand: <><circle cx="8" cy="8" r="6.4" /><path d="M8 5.2v5.6M5.6 8.4 8 10.8l2.4-2.4" /></>,
  neutral: <circle cx="8" cy="8" r="3" />,
};

function StatusGlyph({ tone }: { tone: Tone }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      {GLYPH[tone]}
    </svg>
  );
}

/**
 * Headline number tile.
 *
 * Reading order is deliberate: label (what) -> value (how much) -> status
 * (is that good or bad) -> hint (how it was worked out). The value is the only
 * large element, so a row of tiles scans as a row of numbers.
 */
export function StatTile({
  label,
  value,
  status,
  hint,
  tone = "neutral",
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  /** Short verdict in words — the non-colour half of the signal. */
  status?: string;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p
        className="text-xs font-medium uppercase tracking-[0.06em]"
        style={{ color: "var(--text-faint)" }}
      >
        {label}
      </p>

      <p
        className="mt-2 text-2xl font-semibold leading-none tracking-[-0.02em] tnum"
        style={{ color: tone === "neutral" ? undefined : accent[tone] }}
      >
        {value}
      </p>

      {status ? (
        <p
          className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: accent[tone] }}
        >
          <StatusGlyph tone={tone} />
          {status}
        </p>
      ) : null}

      {hint ? (
        <p className="mt-1.5 text-sm leading-snug" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      ) : null}
    </>
  );

  return (
    <Card
      className={cx(
        "relative overflow-hidden p-5",
        href && "transition-shadow duration-200 hover:shadow-[var(--shadow-pop)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent[tone], opacity: tone === "neutral" ? 0.25 : 0.9 }}
      />
      {href ? (
        <Link href={href} className="block cursor-pointer">
          {body}
          <span className="absolute inset-0" aria-hidden />
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

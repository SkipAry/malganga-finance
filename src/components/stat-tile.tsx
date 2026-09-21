import * as React from "react";
import Link from "next/link";

import { Card, cx } from "./ui/primitives";

type Tone = "neutral" | "money" | "warn" | "risk" | "brand";

const accent: Record<Tone, string> = {
  neutral: "var(--text-muted)",
  money: "var(--color-money-500)",
  warn: "var(--color-warn-500)",
  risk: "var(--color-risk-500)",
  brand: "var(--color-brand-600)",
};

/**
 * Headline number tile. The value is the loudest element; the label sits above
 * it small and quiet so a row of tiles scans as a row of numbers.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p
        className="text-[11.5px] font-medium uppercase tracking-[0.06em]"
        style={{ color: "var(--text-faint)" }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em] tnum"
        style={{ color: tone === "neutral" ? undefined : accent[tone] }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      ) : null}
    </>
  );

  return (
    <Card
      className={cx(
        "relative overflow-hidden p-5",
        href && "transition-shadow hover:shadow-[var(--shadow-pop)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent[tone], opacity: tone === "neutral" ? 0.25 : 0.9 }}
      />
      {href ? (
        <Link href={href} className="block focus-visible:outline-none">
          {body}
          <span className="absolute inset-0" aria-hidden />
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

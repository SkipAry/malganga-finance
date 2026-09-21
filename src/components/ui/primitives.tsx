/**
 * The whole UI kit. Small on purpose: one file of styled primitives beats a
 * component library we would only use 8% of.
 */
import * as React from "react";
import Link from "next/link";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ surfaces */

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cx(
        "rounded-[var(--radius-card)] border bg-[var(--bg-elev)] shadow-[var(--shadow-card)]",
        className,
      )}
      style={{ borderColor: "var(--border)", ...rest.style }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="no-print flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------- buttons */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-[13.5px] font-medium transition-[background,border-color,opacity,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";

const buttonSizes = { sm: "h-8 px-3", md: "h-9.5 px-4 py-2", lg: "h-11 px-5 text-sm" };

function variantClass(variant: ButtonVariant): string {
  switch (variant) {
    case "primary":
      return "bg-brand-600 text-white hover:bg-brand-700 shadow-[0_1px_2px_rgba(16,24,40,0.12)]";
    case "danger":
      return "bg-risk-500 text-white hover:opacity-90";
    case "ghost":
      return "hover:bg-[var(--bg-sunken)]";
    default:
      return "border bg-[var(--bg-elev)] hover:bg-[var(--bg-sunken)]";
  }
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
}) {
  return (
    <button
      {...rest}
      className={cx(buttonBase, buttonSizes[size], variantClass(variant), className)}
    />
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(buttonBase, buttonSizes[size], variantClass(variant), className)}
    >
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------- fields */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
        {required ? <span className="ml-0.5 text-risk-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] text-risk-500">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px]" style={{ color: "var(--text-faint)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const controlClass =
  "h-9.5 w-full rounded-lg border bg-[var(--bg-elev)] px-3 text-[14px] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--text-faint)] focus:border-brand-500 disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} {...rest} className={cx(controlClass, className)} />;
  },
);

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} {...rest} className={cx(controlClass, "pr-8", className)}>
      {children}
    </select>
  );
});

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cx(controlClass, "h-auto min-h-20 py-2 leading-relaxed", className)}
    />
  );
}

/* --------------------------------------------------------------------- atoms */

type Tone = "neutral" | "money" | "warn" | "risk" | "brand";

const toneClass: Record<Tone, string> = {
  neutral: "bg-[var(--bg-sunken)] text-[var(--text-muted)]",
  money: "bg-money-100 text-money-600",
  warn: "bg-warn-100 text-warn-500",
  risk: "bg-risk-100 text-risk-500",
  brand: "bg-brand-100 text-brand-700",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[13.5px]" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Inline callout for assumptions and business-rule warnings. */
export function Note({
  tone = "brand",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("rounded-lg px-3.5 py-3 text-[13px] leading-relaxed", toneClass[tone])}>
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------- tables */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={cx(
        "border-b px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.05em]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
      style={{ color: "var(--text-faint)" }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      {...rest}
      className={cx(
        "border-b px-4 py-2.5 align-middle",
        align === "right" && "text-right tnum",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cx("transition-colors hover:bg-[var(--bg-sunken)]", className)}>{children}</tr>;
}

/* --------------------------------------------------------------------- misc  */

export function Progress({ value, tone = "money" }: { value: number; tone?: Tone }) {
  const barTone =
    tone === "risk" ? "bg-risk-500" : tone === "warn" ? "bg-warn-500" : "bg-money-500";
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: "var(--bg-sunken)" }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx("h-full rounded-full transition-[width] duration-500", barTone)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function DescList({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[12px] uppercase tracking-[0.04em]" style={{ color: "var(--text-faint)" }}>
            {label}
          </dt>
          <dd className="mt-0.5 text-[14px] font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

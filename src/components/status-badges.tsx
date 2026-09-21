import { Badge } from "./ui/primitives";
import {
  INSTALLMENT_STATUS_LABEL,
  type InstallmentStatus,
  type LoanStatus,
} from "@/lib/enums";

export function LoanStatusBadge({ status }: { status: string }) {
  const map: Record<LoanStatus, { tone: "money" | "neutral" | "risk"; label: string }> = {
    ACTIVE: { tone: "money", label: "Active" },
    CLOSED: { tone: "neutral", label: "Closed" },
    DEFAULTED: { tone: "risk", label: "Defaulted" },
  };
  const s = map[status as LoanStatus] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Overdue is derived at read time, so it is passed in rather than stored. */
export function InstallmentStatusBadge({
  status,
  overdue,
}: {
  status: string;
  overdue?: boolean;
}) {
  if (overdue && (status === "PENDING" || status === "PARTIAL")) {
    return <Badge tone="risk">{status === "PARTIAL" ? "Part paid · overdue" : "Overdue"}</Badge>;
  }
  const label = INSTALLMENT_STATUS_LABEL[status as InstallmentStatus] ?? status;
  const tone =
    status === "PAID" || status === "DEDUCTED_AT_DISBURSAL"
      ? "money"
      : status === "PARTIAL"
        ? "warn"
        : "neutral";
  return <Badge tone={tone}>{label}</Badge>;
}

export function ModeBadge({ mode }: { mode: string }) {
  return <Badge tone={mode === "CASH" ? "warn" : "brand"}>{mode === "CASH" ? "Cash" : "Online"}</Badge>;
}

export function InvestorTypeBadge({ type }: { type: string }) {
  return (
    <Badge tone={type === "INTERNAL" ? "brand" : "neutral"}>
      {type === "INTERNAL" ? "Internal" : "External"}
    </Badge>
  );
}

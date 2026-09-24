import { Badge } from "./ui/primitives";
import type { MessageKey } from "@/lib/i18n";
import { getTranslate } from "@/lib/locale";

/**
 * Async server components so each badge reads the active language itself.
 * The alternative - threading a translator through every call site - would
 * touch every table row in the app for no gain, since none of these render
 * on the client.
 */

export async function LoanStatusBadge({ status }: { status: string }) {
  const t = await getTranslate();
  const tone =
    status === "ACTIVE" ? "money" : status === "DEFAULTED" ? "risk" : "neutral";
  const key = `loanStatus.${status}` as MessageKey;
  const label = status in { ACTIVE: 1, CLOSED: 1, DEFAULTED: 1 } ? t(key) : status;
  return <Badge tone={tone}>{label}</Badge>;
}

/** Overdue is derived at read time, so it is passed in rather than stored. */
export async function InstallmentStatusBadge({
  status,
  overdue,
}: {
  status: string;
  overdue?: boolean;
}) {
  const t = await getTranslate();

  if (overdue && (status === "PENDING" || status === "PARTIAL")) {
    return (
      <Badge tone="risk">
        {status === "PARTIAL"
          ? t("installmentStatus.partialOverdue")
          : t("installmentStatus.overdue")}
      </Badge>
    );
  }

  const known = status === "PENDING" || status === "PARTIAL" || status === "PAID" || status === "WAIVED";
  const label = known ? t(`installmentStatus.${status}` as MessageKey) : status;
  const tone = status === "PAID" ? "money" : status === "PARTIAL" ? "warn" : "neutral";
  return <Badge tone={tone}>{label}</Badge>;
}

export async function ModeBadge({ mode }: { mode: string }) {
  const t = await getTranslate();
  return (
    <Badge tone={mode === "CASH" ? "warn" : "brand"}>
      {mode === "CASH" ? t("mode.CASH") : t("mode.ONLINE")}
    </Badge>
  );
}

export async function InvestorTypeBadge({ type }: { type: string }) {
  const t = await getTranslate();
  return (
    <Badge tone={type === "INTERNAL" ? "brand" : "neutral"}>
      {type === "INTERNAL" ? t("investorType.INTERNAL") : t("investorType.EXTERNAL")}
    </Badge>
  );
}

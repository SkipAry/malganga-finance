import Link from "next/link";

import { Card, CardHeader, Progress } from "./ui/primitives";
import type { Translate } from "@/lib/i18n";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import type { AgeingBucket, CollectionHealth } from "@/lib/reports";

type Tone = "money" | "warn" | "risk";

/**
 * Thresholds for the collection rate. A starting point, not a policy: most
 * small-ticket lenders treat 90%+ of due as healthy and under 70% as a book
 * that needs a field visit. Change them here if Malganga reads it differently.
 */
const ON_TRACK = 90;
const SLIPPING = 70;

function rateTone(rate: number): Tone {
  return rate >= ON_TRACK ? "money" : rate >= SLIPPING ? "warn" : "risk";
}

const TONE_VAR: Record<Tone, string> = {
  money: "var(--tone-money)",
  warn: "var(--tone-warn)",
  risk: "var(--tone-risk)",
};

/** Later buckets escalate, but the label carries the meaning, not the colour. */
const BUCKETS: { key: AgeingBucket; tone: Tone; label: "ageing.d1_7" | "ageing.d8_30" | "ageing.d31" }[] = [
  { key: "d1_7", tone: "warn", label: "ageing.d1_7" },
  { key: "d8_30", tone: "risk", label: "ageing.d8_30" },
  { key: "d31", tone: "risk", label: "ageing.d31" },
];

export function CollectionHealthCard({ health, t }: { health: CollectionHealth; t: Translate }) {
  const { dueThisMonthPaise: due, collectedAgainstDuePaise: collected, ageing } = health;
  const rate = due > 0 ? (collected / due) * 100 : null;
  const tone = rate === null ? null : rateTone(rate);

  const overdueTotal = BUCKETS.reduce((sum, b) => sum + ageing[b.key].paise, 0);

  return (
    <Card>
      <CardHeader title={t("health.title")} subtitle={t("health.sub")} />

      <div className="px-5 pb-5">
        {rate === null ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("health.nothingDue")}
          </p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p
                className="text-[32px] font-semibold leading-none tracking-[-0.03em] tnum"
                style={{ color: TONE_VAR[tone!] }}
              >
                {Math.round(rate)}%
              </p>
              <p className="text-sm font-medium" style={{ color: TONE_VAR[tone!] }}>
                {tone === "money"
                  ? t("health.onTrack")
                  : tone === "warn"
                    ? t("health.slipping")
                    : t("health.behind")}
              </p>
            </div>
            <Progress
              value={rate}
              tone={tone!}
              label={t("health.rateLabel")}
              className="mt-3 h-2"
            />
            <p className="mt-2 text-sm tnum" style={{ color: "var(--text-muted)" }}>
              {t("health.collectedOfDue", {
                collected: formatMoney(collected),
                due: formatMoney(due),
              })}
            </p>
          </>
        )}

        <div className="mt-5 border-t pt-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">{t("health.ageingTitle")}</h3>
            {overdueTotal > 0 ? (
              <Link
                href="/collections?days=0"
                className="tap inline-flex items-center text-sm font-medium text-ontone-brand hover:underline"
              >
                {t("action.viewAll")}
              </Link>
            ) : null}
          </div>

          {overdueTotal === 0 ? (
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              {t("tile.overdue.none")}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {BUCKETS.map((b) => {
                const { paise, count } = ageing[b.key];
                const share = overdueTotal > 0 ? (paise / overdueTotal) * 100 : 0;
                return (
                  <li key={b.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span style={{ color: "var(--text-muted)" }}>
                        {t(b.label)}
                        <span className="ml-1.5 text-xs tnum" style={{ color: "var(--text-faint)" }}>
                          {t.plural(count, "emi.count.one", "emi.count.other")}
                        </span>
                      </span>
                      <span
                        className="font-semibold tnum"
                        style={paise > 0 ? { color: TONE_VAR[b.tone] } : undefined}
                      >
                        {paise > 0 ? formatMoneyCompact(paise) : "—"}
                      </span>
                    </div>
                    <Progress
                      value={share}
                      tone={b.tone}
                      label={t(b.label)}
                      className="mt-1.5"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

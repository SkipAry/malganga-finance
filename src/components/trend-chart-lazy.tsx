"use client";

import dynamic from "next/dynamic";

import type { TrendPoint } from "@/lib/reports";

/**
 * Recharts is roughly 100 kB - half of everything the dashboard downloads,
 * for one chart that sits below the tiles. Loading it after the page is
 * interactive lets the numbers render immediately, which is what matters on
 * a phone on a field connection.
 *
 * The placeholder reserves the chart's exact height, so the tiles below it do
 * not jump when the chart arrives (CLS).
 */
const TrendChart = dynamic(() => import("./trend-chart").then((m) => m.TrendChart), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] w-full px-2 pb-2 pt-4" aria-hidden="true">
      <div className="h-full w-full animate-pulse rounded-lg bg-[var(--bg-sunken)]" />
    </div>
  ),
});

export function TrendChartLazy({ data }: { data: TrendPoint[] }) {
  return <TrendChart data={data} />;
}

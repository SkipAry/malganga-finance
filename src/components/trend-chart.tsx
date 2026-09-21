"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/lib/reports";

/** Compact axis labels: 1.2L / 45K / 900. */
function shortRupee(value: number): string {
  if (Math.abs(value) >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

const full = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Each series carries its own dash pattern as well as its own colour, so the
 * three lines stay tellable apart in greyscale, in print and for the ~8% of
 * men with a colour-vision deficiency (WCAG 1.4.1).
 */
const SERIES = [
  { key: "collected", name: "Collected", color: "var(--tone-money)", dash: undefined, fill: "url(#gCollected)" },
  { key: "disbursed", name: "Disbursed", color: "var(--tone-brand)", dash: "7 4", fill: "url(#gDisbursed)" },
  { key: "expenses", name: "Expenses", color: "var(--tone-warn)", dash: "2 3", fill: "none" },
] as const;

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[260px] w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--tone-money)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--tone-money)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gDisbursed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--tone-brand)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--tone-brand)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--text-faint)" }}
            dy={6}
          />
          <YAxis
            tickFormatter={shortRupee}
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 12, fill: "var(--text-faint)" }}
          />
          <Tooltip
            formatter={(v: number, name) => [full.format(v), name]}
            contentStyle={{
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 13,
              boxShadow: "var(--shadow-pop)",
              color: "var(--text)",
            }}
            cursor={{ stroke: "var(--border-strong)" }}
          />
          {/* plainline so the legend swatch shows each series' actual dash pattern */}
          <Legend
            iconType="plainline"
            iconSize={18}
            wrapperStyle={{ fontSize: 13, paddingTop: 10, color: "var(--text-muted)" }}
          />

          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dash}
              fill={s.fill}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

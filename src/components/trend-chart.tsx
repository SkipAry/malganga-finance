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

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[260px] w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-money-500)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-money-500)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gDisbursed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
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
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "var(--text-muted)" }}
          />
          <Area
            type="monotone"
            dataKey="collected"
            name="Collected"
            stroke="var(--color-money-500)"
            strokeWidth={2}
            fill="url(#gCollected)"
          />
          <Area
            type="monotone"
            dataKey="disbursed"
            name="Disbursed"
            stroke="var(--color-brand-500)"
            strokeWidth={2}
            fill="url(#gDisbursed)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="var(--color-warn-500)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

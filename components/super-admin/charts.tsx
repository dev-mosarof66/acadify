"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatNumber, formatTaka } from "@/lib/super-admin/data";

const mrrConfig = { mrr: { label: "MRR", color: "var(--chart-1)" } } satisfies ChartConfig;
const smsConfig = { sms: { label: "SMS sent", color: "var(--chart-1)" } } satisfies ChartConfig;

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLabel = (day: string) => DAY_LABEL.format(new Date(`${day}T00:00:00Z`));

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

/** Single-series area: monthly recurring revenue. One hue, no legend (the panel title names it). */
export function MrrChart({ data }: { data: { month: string; mrr: number }[] }) {
  return (
    <ChartContainer config={mrrConfig} className="aspect-auto h-[260px] w-full">
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="mrr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-mrr)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-mrr)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tick={AXIS_TICK}
          tickFormatter={(m: string) => m.split(" ")[0]}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tick={AXIS_TICK}
          tickFormatter={(v: number) => (v === 0 ? "0" : `৳${v / 1000}k`)}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 4" }}
          content={<ChartTooltipContent indicator="line" formatter={(v) => <span className="font-bold tabular-nums">{formatTaka(Number(v))}</span>} />}
        />
        <Area
          dataKey="mrr"
          type="monotone"
          stroke="var(--color-mrr)"
          strokeWidth={2}
          fill="url(#mrr-fill)"
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </AreaChart>
    </ChartContainer>
  );
}


/** SMS parts sent per day (last 14 days), from the sms_messages log. */
export function SmsChart({ data }: { data: { day: string; sms: number }[] }) {
  return (
    <ChartContainer config={smsConfig} className="aspect-auto h-[220px] w-full">
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap={4}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} tick={AXIS_TICK} tickFormatter={dayLabel} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} width={40} tick={AXIS_TICK} allowDecimals={false} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => dayLabel(String(p?.[0]?.payload?.day ?? ""))}
              formatter={(v) => <span className="font-bold tabular-nums">{formatNumber(Number(v))} SMS</span>}
            />
          }
        />
        <Bar dataKey="sms" fill="var(--color-sms)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

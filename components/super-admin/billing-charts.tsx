"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/components/super-admin/ui";
import { billingYears, formatTaka, PAYMENT_METHODS, paymentsByMonth, revenueByMonth, type Invoice } from "@/lib/super-admin/data";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
const taka = (v: number) => (v === 0 ? "0" : `৳${v / 1000}k`);

function YearSelect({ year, years, onChange, label }: { year: number; years: number[]; onChange: (y: number) => void; label: string }) {
  const YEAR_ITEMS = years.map((y) => ({ value: String(y), label: String(y) }));
  return (
    <Select value={String(year)} onValueChange={(v) => v && onChange(Number(v))} items={YEAR_ITEMS}>
      <SelectTrigger aria-label={label} className="h-8 w-[92px] rounded-lg bg-card text-[13px] font-semibold dark:bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {YEAR_ITEMS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ChartHeader({ title, description, action }: { title: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

const revenueConfig = { revenue: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig;

/** Single series: revenue billed per month in the chosen year. */
export function MonthlyRevenueChart({ invoices }: { invoices: Invoice[] }) {
  const years = billingYears(invoices);
  const [year, setYear] = React.useState<number>(years[0] ?? new Date().getFullYear());
  const data = revenueByMonth(invoices, year);
  const firstMonth = [...invoices].sort((a, b) => a.periodStart.localeCompare(b.periodStart))[0]?.periodStart;
  const months = data.filter((d) => d.revenue !== null);
  const total = months.reduce((s, d) => s + (d.revenue ?? 0), 0);
  const best = months.reduce<(typeof data)[number] | null>((b, d) => (!b || (d.revenue ?? 0) > (b.revenue ?? 0) ? d : b), null);

  return (
    <Panel>
      <ChartHeader
        title="Monthly revenue"
        description={
          months.length
            ? `${formatTaka(total)} billed in ${year}${best ? ` · best month ${best.month} (${formatTaka(best.revenue ?? 0)})` : ""}`
            : `No billing in ${year}`
        }
        action={<YearSelect year={year} years={years} onChange={setYear} label="Revenue year" />}
      />
      <div className="p-4 pt-2">
        <ChartContainer config={revenueConfig} className="aspect-auto h-[280px] w-full">
          <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap={6}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} tick={AXIS_TICK} />
            <YAxis tickLine={false} axisLine={false} width={52} tick={AXIS_TICK} tickFormatter={taka} />
            <ChartTooltip
              cursor={{ fill: "var(--secondary)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(m) => `${m} ${year}`}
                  formatter={(v) => <span className="font-bold tabular-nums">{formatTaka(Number(v))}</span>}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ChartContainer>
        {firstMonth?.startsWith(String(year)) && (
          <p className="px-2 pt-2 text-[12.5px] text-muted-foreground">
            Billing started in {new Date(`${firstMonth}T00:00:00Z`).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}.
          </p>
        )}
      </div>
    </Panel>
  );
}

const gatewayConfig = {
  bKash: { label: "bKash", color: "var(--chart-1)" },
  Bank: { label: "Bank", color: "var(--chart-2)" },
  Nagad: { label: "Nagad", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Stacked bars: payments received per month, split by gateway (fixed order bKash → Bank → Nagad). */
export function GatewayByMonthChart({ invoices }: { invoices: Invoice[] }) {
  const years = billingYears(invoices);
  const [year, setYear] = React.useState<number>(years[0] ?? new Date().getFullYear());
  const data = paymentsByMonth(invoices, year);
  const totals = PAYMENT_METHODS.map((m) => ({ method: m, total: data.reduce((s, d) => s + (d[m] ?? 0), 0) }));
  const grand = totals.reduce((s, t) => s + t.total, 0);

  return (
    <Panel>
      <ChartHeader
        title="Payments by gateway"
        description={grand ? `${formatTaka(grand)} received in ${year}` : `No payments in ${year}`}
        action={<YearSelect year={year} years={years} onChange={setYear} label="Payments year" />}
      />
      <div className="p-4 pt-2">
        {/* Legend with yearly totals doubles as the direct label for each series */}
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 px-2 pt-2 pb-1 text-[13px]" aria-label="Legend">
          {totals.map((t) => (
            <li key={t.method} className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px]" style={{ background: gatewayConfig[t.method].color }} />
              <span className="font-semibold">{t.method}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatTaka(t.total)}
                {grand ? ` · ${Math.round((t.total / grand) * 100)}%` : ""}
              </span>
            </li>
          ))}
        </ul>
        <ChartContainer config={gatewayConfig} className="aspect-auto h-[252px] w-full">
          <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap={6}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} tick={AXIS_TICK} />
            <YAxis tickLine={false} axisLine={false} width={52} tick={AXIS_TICK} tickFormatter={taka} />
            <ChartTooltip
              cursor={{ fill: "var(--secondary)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(m) => `${m} ${year}`}
                  formatter={(v, name) => (
                    <span className="flex w-full items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-[3px]" style={{ background: gatewayConfig[name as keyof typeof gatewayConfig].color }} />
                        {name}
                      </span>
                      <span className="font-bold tabular-nums">{formatTaka(Number(v))}</span>
                    </span>
                  )}
                />
              }
            />
            {PAYMENT_METHODS.map((m, i) => (
              <Bar
                key={m}
                dataKey={m}
                stackId="gateway"
                fill={`var(--color-${m})`}
                stroke="var(--card)"
                strokeWidth={2}
                maxBarSize={36}
                radius={i === PAYMENT_METHODS.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </Panel>
  );
}

import Link from "next/link";
import { AlertTriangle, ArrowRight, Ban, Building2, CreditCard, Hourglass, Inbox, MessageSquareText, Users, Wallet, Zap } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MrrChart, SmsChart } from "@/components/super-admin/charts";
import { DemoStatusBadge, initials, PageHeader, Panel, PanelHeader, StatCard } from "@/components/super-admin/ui";
import {
  daysUntil,
  formatDate,
  formatNumber,
  formatTaka,
  revenueHistory,
  timeAgo,
  TYPE_LABELS,
  type InstituteType,
} from "@/lib/super-admin/data";
import { getSmsDaily } from "@/lib/sms/queries";
import { getActivity, getDemoRequests, getInstitutes, getInvoices, getPlatformTotals, getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: { absolute: "Overview — Acadify Admin" } };

const ACTIVITY_ICONS = {
  signup: Building2,
  payment: Wallet,
  upgrade: Zap,
  sms: MessageSquareText,
  overdue: AlertTriangle,
  demo: Inbox,
} as const;

function greeting(now: Date) {
  const hour = Number(now.toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function OverviewPage() {
  const [totals, institutes, invoices, demos, activity, now] = await Promise.all([
    getPlatformTotals(),
    getInstitutes(),
    getInvoices(),
    getDemoRequests(),
    getActivity({ limit: 8 }),
    getRequestTime(),
  ]);
  const smsDays = await getSmsDaily(now);
  const smsTwoWeeks = smsDays.reduce((sum, d) => sum + d.sms, 0);

  const history = revenueHistory(invoices, 12);
  const [prev, current] = history.slice(-2);
  const mrrGrowth = prev && current ? ((current.mrr - prev.mrr) / prev.mrr) * 100 : 0;

  const attention = [
    ...institutes
      .filter((i) => i.status === "past_due")
      .map((i) => ({ slug: i.slug, name: i.name, icon: AlertTriangle, tone: "text-accent-foreground dark:text-warning", text: `Payment overdue since ${formatDate(i.renewsOn)}` })),
    ...institutes
      .filter((i) => i.status === "suspended")
      .map((i) => ({ slug: i.slug, name: i.name, icon: Ban, tone: "text-destructive", text: `Suspended · last active ${timeAgo(i.lastActive, now)}` })),
    ...institutes
      .filter((i) => i.status === "trial" && daysUntil(i.renewsOn, now) <= 21)
      .map((i) => ({
        slug: i.slug,
        name: i.name,
        icon: Hourglass,
        tone: "text-sky-700 dark:text-sky-300",
        text: `Trial ends in ${Math.max(0, daysUntil(i.renewsOn, now))} days`,
      })),
    ...institutes
      .filter((i) => i.status !== "suspended" && i.smsUsed / i.smsCredit >= 0.9)
      .map((i) => ({
        slug: i.slug,
        name: i.name,
        icon: MessageSquareText,
        tone: "text-accent-foreground dark:text-warning",
        text: `SMS credit ${Math.round((i.smsUsed / i.smsCredit) * 100)}% used`,
      })),
  ];

  const byType = (Object.keys(TYPE_LABELS) as InstituteType[])
    .map((type) => ({ type, count: institutes.filter((i) => i.type === type).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxType = Math.max(1, ...byType.map((r) => r.count));

  return (
    <>
      <PageHeader
        title={greeting(new Date(now))}
        description={`Here is how Acadify is doing today, ${formatDate(new Date(now).toISOString())}.`}
        actions={
          <Button nativeButton={false} render={<Link href="/admin/institutes" />} className="h-10 gap-2 rounded-full px-4 font-bold">
            <Building2 className="size-4" />
            View institutes
          </Button>
        }
      />

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly recurring revenue"
          value={formatTaka(totals.mrr)}
          icon={Wallet}
          trend={prev ? { value: `${mrrGrowth.toFixed(1)}%`, up: mrrGrowth >= 0 } : undefined}
          note="billed vs last month"
        />
        <StatCard
          label="Institutes"
          value={formatNumber(totals.institutes)}
          icon={Building2}
          note={`${totals.active} active · ${totals.trials} on trial · ${totals.pastDue} past due`}
        />
        <StatCard label="Students on platform" value={formatNumber(totals.students)} icon={Users} note="across all institutes" />
        <StatCard
          label="Outstanding invoices"
          value={formatTaka(totals.outstanding)}
          icon={CreditCard}
          note={
            <Link href="/admin/billing" className="font-semibold text-primary hover:underline">
              Review billing
            </Link>
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Revenue billed per month" description="Last 12 months, in Taka" />
          <div className="p-4 pt-2">
            <MrrChart data={history} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Needs attention"
            description={`${attention.length} ${attention.length === 1 ? "item" : "items"}`}
            action={
              <Link href="/admin/institutes" className="text-[13px] font-bold text-primary hover:underline">
                View all
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {attention.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing needs attention right now.</li>}
            {attention.slice(0, 6).map((a, i) => (
              <li key={`${a.slug}-${i}`}>
                <Link href={`/admin/institutes/${a.slug}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary">
                  <a.icon className={`size-[18px] shrink-0 ${a.tone}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{a.name}</span>
                    <span className="block text-[12.5px] text-muted-foreground">{a.text}</span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel>
          <PanelHeader title="SMS sent" description={`${formatNumber(smsTwoWeeks)} in the last 14 days`} />
          {smsTwoWeeks ? (
            <div className="p-4 pt-2">
              <SmsChart data={smsDays} />
            </div>
          ) : (
            <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
              <MessageSquareText className="size-8 text-muted-foreground" />
              <p className="font-bold">No SMS sent yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">This chart fills in once institutes start sending attendance and fee SMS.</p>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Institutes by type" description={`${totals.institutes} institutes`} />
          <ul className="grid gap-3.5 p-5">
            {byType.map((r) => (
              <li key={r.type} className="grid gap-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{TYPE_LABELS[r.type]}</span>
                  <span className="font-bold tabular-nums">{r.count}</span>
                </div>
                <Progress value={(r.count / maxType) * 100} aria-label={`${TYPE_LABELS[r.type]}: ${r.count}`} className="[&_[data-slot=progress-track]]:h-2" />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-2 xl:col-span-1">
          <PanelHeader
            title="New demo requests"
            description={`${totals.newDemos} waiting for a call`}
            action={
              <Link href="/admin/demo-requests" className="text-[13px] font-bold text-primary hover:underline">
                View all
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {demos.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No demo requests yet.</li>}
            {demos.slice(0, 4).map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary-light text-xs font-bold text-primary">{initials(d.name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{d.institute}</span>
                  <span className="block truncate text-[12.5px] text-muted-foreground">
                    {d.name} · {timeAgo(d.createdAt, now)}
                  </span>
                </span>
                <DemoStatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <Panel>
        <PanelHeader title="Recent activity" />
        <ul className="divide-y divide-border">
          {activity.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No activity yet.</li>}
          {activity.map((a) => {
            const Icon = ACTIVITY_ICONS[a.kind];
            return (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-light">
                  <Icon className="size-4 text-primary" />
                </span>
                <p className="min-w-0 flex-1 text-sm">
                  {a.institute && (
                    <Link href={`/admin/institutes/${a.institute.slug}`} className="font-bold hover:text-primary">
                      {a.institute.name}
                    </Link>
                  )}
                  {a.institute ? " · " : ""}
                  <span className="text-muted-foreground">{a.text}</span>
                </p>
                <span className="shrink-0 text-[12.5px] text-muted-foreground">{timeAgo(a.at, now)}</span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

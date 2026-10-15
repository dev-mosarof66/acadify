import { AlertTriangle, CheckCircle2, Clock, Hourglass, Ban, CircleDot, Phone, Trophy, XCircle, CalendarCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DemoStatus, InstituteStatus, InvoiceStatus } from "@/lib/super-admin/data";
import { STATUS_LABELS } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Card with the admin console's radius and border. */
export function Panel({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn("gap-0 rounded-2xl p-0 py-0 ring-border", className)} {...props} />;
}

export function PanelHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  note,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  note?: React.ReactNode;
  trend?: { value: string; up: boolean };
}) {
  return (
    <Panel className="gap-3 p-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
        <span className="grid size-9 place-items-center rounded-full bg-primary-light">
          <Icon className="size-[18px] text-primary" />
        </span>
      </div>
      <p className="text-[28px] leading-none font-extrabold tracking-tight tabular-nums">{value}</p>
      {(note || trend) && (
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
          {trend && (
            <span className={cn("rounded-full px-2 py-0.5 font-bold", trend.up ? "bg-primary-light text-primary" : "bg-danger-light text-destructive")}>
              {trend.up ? "▲" : "▼"} {trend.value}
            </span>
          )}
          {note}
        </p>
      )}
    </Panel>
  );
}

const STATUS_STYLES = {
  green: "bg-primary-light text-primary",
  amber: "bg-warning-light text-accent-foreground dark:text-warning",
  red: "bg-danger-light text-destructive",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  gray: "bg-secondary text-muted-foreground",
} as const;

function Pill({ tone, icon: Icon, children }: { tone: keyof typeof STATUS_STYLES; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className={cn("h-6 gap-1 rounded-full px-2.5 text-[12px] font-bold [&>svg]:size-3.5!", STATUS_STYLES[tone])}>
      <Icon />
      {children}
    </Badge>
  );
}

export function InstituteStatusBadge({ status }: { status: InstituteStatus }) {
  const map = {
    active: { tone: "green", icon: CheckCircle2 },
    trial: { tone: "blue", icon: Hourglass },
    past_due: { tone: "amber", icon: AlertTriangle },
    suspended: { tone: "red", icon: Ban },
  } as const;
  const s = map[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {STATUS_LABELS[status]}
    </Pill>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const map = {
    paid: { tone: "green", icon: CheckCircle2, label: "Paid" },
    due: { tone: "gray", icon: Clock, label: "Due" },
    overdue: { tone: "red", icon: AlertTriangle, label: "Overdue" },
  } as const;
  const s = map[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {s.label}
    </Pill>
  );
}

export const DEMO_STATUS_META = {
  new: { tone: "green", icon: CircleDot, label: "New" },
  contacted: { tone: "blue", icon: Phone, label: "Contacted" },
  scheduled: { tone: "amber", icon: CalendarCheck, label: "Demo scheduled" },
  won: { tone: "green", icon: Trophy, label: "Accepted" },
  lost: { tone: "gray", icon: XCircle, label: "Rejected" },
} as const;

export function DemoStatusBadge({ status }: { status: DemoStatus }) {
  const s = DEMO_STATUS_META[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {s.label}
    </Pill>
  );
}

/** Two-letter initials for avatar fallbacks. */
export function initials(name: string) {
  return name
    .replace(/^(Md\.|Mufti|Maulana|Hafez|Prof\.|Dr\.|Engr\.)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

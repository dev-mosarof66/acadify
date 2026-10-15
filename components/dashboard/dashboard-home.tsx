"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck, Circle, School, ShieldAlert, UserRoundCog, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { can, roleLabel, type InstituteRole, type Permission } from "@/lib/auth/rbac";
import type { SectionDay } from "@/lib/institute/attendance-queries";
import { cn } from "@/lib/utils";

type Stats = { students: number; girls: number; classes: number; staff: number };

function Stat({ label, value, note, icon: Icon, href }: { label: string; value: number; note: string; icon: React.ElementType; href?: string }) {
  const body = (
    <Card className="gap-2 rounded-2xl p-5 py-5 ring-border transition-colors hover:ring-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <span className="grid size-9 place-items-center rounded-full bg-primary-light">
          <Icon className="size-[18px] text-primary" />
        </span>
      </div>
      <p className="text-[30px] leading-none font-extrabold tracking-tight tabular-nums">{value.toLocaleString("en-IN")}</p>
      <p className="text-[13px] text-muted-foreground">{note}</p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Today's attendance: a teacher's own sections, or the whole institute for principals and admins. */
function TodayAttendance({ sections, marksAll }: { sections: SectionDay[]; marksAll: boolean }) {
  const done = sections.filter((s) => s.taken);
  const absent = done.reduce((n, s) => n + (s.taken?.absent ?? 0), 0);
  const pending = sections.filter((s) => !s.taken);

  return (
    <Card className="gap-0 rounded-2xl p-0 py-0 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight">Today&apos;s attendance</h2>
          <p className="text-[13px] text-muted-foreground">
            {sections.length
              ? `${done.length} of ${sections.length} ${marksAll ? "sections" : "of your sections"} done${done.length ? ` · ${absent} absent` : ""}`
              : marksAll
                ? "Add classes and sections to start taking attendance."
                : "You aren't assigned to a section yet. Ask your principal."}
          </p>
        </div>
        {sections.length > 0 && (
          <Link href="/dashboard/attendance" className="text-sm font-bold text-primary hover:underline">
            {pending.length ? "Take attendance →" : "View all →"}
          </Link>
        )}
      </div>
      {pending.length > 0 && (
        <ul className="divide-y divide-border">
          {pending.slice(0, 6).map((s) => (
            <li key={s.sectionId}>
              <Link href={`/dashboard/attendance/${s.sectionId}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-secondary/60">
                <span className="font-semibold">
                  {s.className} · {s.sectionName}
                  <span className="ml-2 font-normal text-muted-foreground">{s.students} students</span>
                </span>
                <span className="font-bold text-accent-foreground dark:text-warning">Not taken</span>
              </Link>
            </li>
          ))}
          {pending.length > 6 && <li className="px-5 py-3 text-sm text-muted-foreground">and {pending.length - 6} more</li>}
        </ul>
      )}
    </Card>
  );
}

export function DashboardHome({
  name,
  instituteName,
  role,
  instituteType,
  stats,
  today,
  marksAll,
  forbidden,
}: {
  name: string;
  instituteName: string;
  role: InstituteRole;
  instituteType: string;
  stats: Stats;
  /** Sections this person can mark today, or null if their role doesn't see attendance. */
  today: SectionDay[] | null;
  marksAll: boolean;
  forbidden?: boolean;
}) {
  const { t } = useLocale();

  // First steps for the people who set the institute up
  const steps: { done: boolean; title: string; text: string; href: string; permission: Permission }[] = [
    { done: stats.classes > 0, title: "Add your classes and sections", text: "Class 6, Dakhil 9th, Hifz… with sections and shifts.", href: "/dashboard/classes", permission: "institute:settings" },
    { done: stats.students > 0, title: "Add your students", text: "Name, class, roll and the guardian's mobile for SMS.", href: "/dashboard/students", permission: "students:write" },
    { done: stats.staff > 1, title: "Give your staff access", text: "Teachers and accountants get their own sign-in.", href: "/dashboard/staff", permission: "members:manage" },
  ];
  const mine = steps.filter((s) => can(role, s.permission));
  const remaining = mine.filter((s) => !s.done).length;

  return (
    <div className="grid gap-6">
      {forbidden && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
          <ShieldAlert className="size-4" />
          {t("dashboard.forbidden")}
        </p>
      )}

      <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,#1F5F1F_0%,#2C7A26_60%,#57B53A_100%)] p-7 text-white sm:p-9">
        <span aria-hidden className="absolute -right-16 -bottom-16 size-64 rounded-full bg-white/10" />
        <div className="relative grid gap-2">
          <Badge className="w-fit rounded-full bg-white/15 px-3 font-bold text-white">{roleLabel(role, instituteType)}</Badge>
          {/* Full name: Bangladeshi names often start with "Md" or "Abdur" */}
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">{t("dashboard.welcome").replace("{name}", name.trim())}</h1>
          <p className="text-white/85">{t("dashboard.subtitle").replace("{institute}", instituteName).replace("{role}", roleLabel(role, instituteType))}</p>
        </div>
      </section>

      <section aria-label="Your institute" className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Students"
          value={stats.students}
          note={stats.students ? `${stats.girls.toLocaleString("en-IN")} girls · ${(stats.students - stats.girls).toLocaleString("en-IN")} boys` : "None added yet"}
          icon={Users}
          href={can(role, "students:read") ? "/dashboard/students" : undefined}
        />
        <Stat label="Classes" value={stats.classes} note={stats.classes ? "With their sections and shifts" : "None set up yet"} icon={School} href={can(role, "institute:settings") ? "/dashboard/classes" : undefined} />
        <Stat label="Staff with access" value={stats.staff} note="People who can sign in" icon={UserRoundCog} href={can(role, "members:manage") ? "/dashboard/staff" : undefined} />
      </section>

      {today && <TodayAttendance sections={today} marksAll={marksAll} />}

      {mine.length > 0 && remaining > 0 && (
        <section aria-label="Getting started">
          <Card className="gap-0 rounded-2xl p-0 py-0 ring-border">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-extrabold tracking-tight">Getting started</h2>
              <p className="text-[13px] text-muted-foreground">
                {remaining} of {mine.length} {mine.length === 1 ? "step" : "steps"} left to set up {instituteName}
              </p>
            </div>
            <ol className="divide-y divide-border">
              {mine.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/60">
                    {s.done ? <CircleCheck className="size-6 shrink-0 text-primary" /> : <Circle className="size-6 shrink-0 text-muted-foreground" />}
                    <span className="grid min-w-0 flex-1">
                      <span className={cn("font-bold", s.done && "text-muted-foreground line-through")}>{s.title}</span>
                      <span className="text-[13px] text-muted-foreground">{s.text}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      )}
    </div>
  );
}

export default DashboardHome;

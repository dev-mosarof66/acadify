"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/super-admin/ui";
import { StudentAvatar } from "@/components/dashboard/students";
import { useLocale } from "@/components/providers/locale-provider";
import { ROLE_LABELS, type InstituteRole } from "@/lib/auth/rbac";
import { taka } from "@/lib/fees/format";
import type { LinkedStudent } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

export interface ChildSummary {
  student: LinkedStudent;
  attendanceRate: number | null;
  absent: number;
  outstanding: number;
}

/** Home for students and guardians: one card per linked student. */
export function PortalHome({
  name,
  instituteName,
  role,
  students,
  forbidden,
}: {
  name: string;
  instituteName: string;
  role: InstituteRole;
  students: ChildSummary[];
  forbidden?: boolean;
}) {
  const { t } = useLocale();
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
          <Badge className="w-fit rounded-full bg-white/15 px-3 font-bold text-white">{ROLE_LABELS[role]}</Badge>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">{t("dashboard.welcome").replace("{name}", name.trim())}</h1>
          <p className="text-white/85">
            {role === "guardian" ? "Attendance, fees and results for your children at " : "Your attendance, fees, results and lecture sheets at "}
            {instituteName}
          </p>
        </div>
      </section>

      {students.length === 0 ? (
        <Panel>
          <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
            <UserRound className="size-8 text-muted-foreground" />
            <p className="font-bold">No student linked to your account</p>
            <p className="max-w-sm text-sm text-muted-foreground">Ask the institute office to give your email access from the student&apos;s page.</p>
          </div>
        </Panel>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {students.map(({ student: s, attendanceRate, absent, outstanding }) => (
            <li key={s.id}>
              <Link href={`/dashboard/children/${s.id}`} className="block h-full">
                <Panel className="h-full transition-colors hover:ring-primary/40">
                  <div className="grid gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <StudentAvatar student={s} className="size-12" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-extrabold tracking-tight">{s.name}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {s.className} · Section {s.sectionName} · Roll {s.roll}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                    <dl className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-secondary/60 px-4 py-3">
                        <dt className="text-[12px] font-semibold text-muted-foreground">Attendance this month</dt>
                        <dd className="text-xl font-extrabold tabular-nums">
                          {attendanceRate === null ? "—" : `${attendanceRate}%`}
                          {absent > 0 && <span className="ml-1.5 text-[12.5px] font-bold text-destructive">{absent} absent</span>}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-secondary/60 px-4 py-3">
                        <dt className="text-[12px] font-semibold text-muted-foreground">Fees due</dt>
                        <dd className={cn("text-xl font-extrabold tabular-nums", outstanding > 0 ? "text-destructive" : "text-primary")}>
                          {outstanding > 0 ? taka(outstanding) : "Paid up"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, CheckCheck, CircleCheck, ClipboardList, Loader2, MessageSquareText, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/super-admin/ui";
import { SHIFT_LABELS } from "@/lib/ui/labels";
import { saveAttendance, sendAbsenceSms } from "@/lib/institute/attendance-actions";
import type { AttendanceStatus, SectionDay, SheetRow } from "@/lib/institute/attendance-queries";
import type { Shift } from "@/lib/institute/queries";
import { cn } from "@/lib/utils";

const STATUS: Record<AttendanceStatus, { label: string; short: string; tone: string }> = {
  present: { label: "Present", short: "P", tone: "border-primary/30 bg-primary-light text-primary" },
  absent: { label: "Absent", short: "A", tone: "border-destructive/40 bg-danger-light text-destructive" },
  late: { label: "Late", short: "L", tone: "border-warning bg-warning-light text-accent-foreground dark:text-warning" },
  leave: { label: "On leave", short: "Lv", tone: "border-border bg-secondary text-muted-foreground" },
};
const ORDER: AttendanceStatus[] = ["present", "absent", "late", "leave"];


/** Date picker that moves the page to another day (?date=). */
export function DatePicker({ date, today, earliest, basePath }: { date: string; today: string; earliest: string; basePath: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <CalendarDays className="size-4 text-primary" />
      <span className="sr-only">Day</span>
      <Input
        type="date"
        value={date}
        min={earliest}
        max={today}
        onChange={(e) => e.target.value && router.push(`${basePath}?date=${e.target.value}`)}
        className="h-10 w-[170px] rounded-xl bg-card dark:bg-card"
      />
    </label>
  );
}

/** Sections the person can mark, with whether that day's attendance is done. */
export function SectionDayList({ sections, date, emptyText }: { sections: SectionDay[]; date: string; emptyText: string }) {
  if (!sections.length) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <ClipboardList className="size-8 text-muted-foreground" />
          <p className="font-bold">No sections to show</p>
          <p className="max-w-sm text-sm text-muted-foreground">{emptyText}</p>
        </div>
      </Panel>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sections.map((s) => (
        <li key={s.sectionId}>
          <Link href={`/dashboard/attendance/${s.sectionId}?date=${date}`} className="block h-full">
            <Panel className="h-full transition-colors hover:ring-primary/40">
              <div className="grid gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold">
                      {s.className} · {s.sectionName}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {SHIFT_LABELS[s.shift]} shift · {s.students} students
                      {s.isClassTeacher && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-primary">
                          <Star className="size-3 fill-current" />
                          Class teacher
                        </span>
                      )}
                    </p>
                  </div>
                  {s.taken ? (
                    <Badge className="h-6 gap-1 rounded-full bg-primary-light px-2.5 text-[11.5px] font-bold text-primary [&>svg]:size-3!">
                      <CircleCheck />
                      Done
                    </Badge>
                  ) : (
                    <Badge className="h-6 rounded-full bg-warning-light px-2.5 text-[11.5px] font-bold text-accent-foreground dark:text-warning">Not taken</Badge>
                  )}
                </div>
                {s.taken ? (
                  <p className="text-sm">
                    <span className="font-bold text-primary">{s.taken.present + s.taken.late} in class</span>
                    {s.taken.absent > 0 && <span className="font-bold text-destructive"> · {s.taken.absent} absent</span>}
                    {s.taken.leave > 0 && <span className="text-muted-foreground"> · {s.taken.leave} on leave</span>}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-primary">Take attendance →</p>
                )}
              </div>
            </Panel>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => !/^(md\.?|mst\.?)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/**
 * The marking sheet. Everyone starts present; tap a student to mark them absent, or pick
 * late / on leave from their row. Saving can be repeated to correct mistakes.
 */
export function AttendanceSheet({
  section,
  date,
  rows,
  taken,
  markedAt,
  canSms,
}: {
  section: { id: string; name: string; shift: Shift; className: string };
  date: string;
  rows: SheetRow[];
  taken: boolean;
  markedAt: string | null;
  canSms: boolean;
}) {
  const router = useRouter();
  const [marks, setMarks] = React.useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(rows.map((r) => [r.studentId, r.status ?? "present"]))
  );
  const [message, setMessage] = React.useState<{ ok: boolean; text: string }>();
  const [saving, startSave] = React.useTransition();
  const [texting, startSms] = React.useTransition();
  const dirty = rows.some((r) => (r.status ?? "present") !== marks[r.studentId]) || !taken;

  const set = (id: string, s: AttendanceStatus) => {
    setMarks((m) => ({ ...m, [id]: s }));
    setMessage(undefined);
  };
  const counts = ORDER.reduce((c, s) => ({ ...c, [s]: Object.values(marks).filter((m) => m === s).length }), {} as Record<AttendanceStatus, number>);
  const savedAbsentNotTexted = rows.filter((r) => r.status === "absent" && !r.smsSent).length;

  const save = () =>
    startSave(async () => {
      const r = await saveAttendance(
        section.id,
        date,
        rows.map((row) => ({ studentId: row.studentId, status: marks[row.studentId] }))
      );
      setMessage(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });

  const sms = () =>
    startSms(async () => {
      const r = await sendAbsenceSms(section.id, date);
      setMessage(r.ok ? { ok: true, text: r.message ?? "Sent." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });

  if (!rows.length) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <ClipboardList className="size-8 text-muted-foreground" />
          <p className="font-bold">No active students in this section</p>
          <p className="text-sm text-muted-foreground">Add students to {section.className}, section {section.name} first.</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 pb-24">
      <Panel>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {ORDER.map((s) => (
              <span key={s} className={cn("rounded-full border px-3 py-1 font-bold tabular-nums", STATUS[s].tone)}>
                {STATUS[s].label}: {counts[s]}
              </span>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMarks(Object.fromEntries(rows.map((r) => [r.studentId, "present" as const])))}
            className="ml-auto gap-1.5 rounded-full px-3 font-bold"
          >
            <CheckCheck className="size-4" />
            All present
          </Button>
        </div>
        {taken && markedAt && (
          <p className="border-t border-border px-5 py-2.5 text-[13px] text-muted-foreground">
            Already taken. Change anything and save again to correct it.
          </p>
        )}
      </Panel>

      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const s = marks[r.studentId];
          return (
            <li key={r.studentId} className={cn("flex items-center gap-3 rounded-2xl border-2 bg-card p-3 transition-colors", s !== "present" && STATUS[s].tone)}>
              <button
                type="button"
                onClick={() => set(r.studentId, s === "absent" ? "present" : "absent")}
                aria-pressed={s === "absent"}
                aria-label={`${r.name}, roll ${r.roll}: ${STATUS[s].label}. Tap to mark ${s === "absent" ? "present" : "absent"}.`}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
              >
                <span className="w-7 shrink-0 text-center text-sm font-extrabold tabular-nums">{r.roll}</span>
                <Avatar className="size-10 shrink-0">
                  {r.hasPhoto && <AvatarImage src={`/api/students/${r.studentId}/photo`} alt="" className="object-cover" />}
                  <AvatarFallback className="bg-primary-light text-xs font-bold text-primary">{initials(r.name)}</AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate font-bold">{r.name}</span>
                  <span className="text-[12px] font-semibold opacity-80">{STATUS[s].label}</span>
                </span>
              </button>
              <div role="radiogroup" aria-label={`Status for ${r.name}`} className="flex shrink-0 gap-1">
                {ORDER.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={s === opt}
                    aria-label={STATUS[opt].label}
                    title={STATUS[opt].label}
                    onClick={() => set(r.studentId, opt)}
                    className={cn(
                      "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg border px-1.5 text-[11.5px] font-extrabold transition-colors",
                      s === opt ? STATUS[opt].tone : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {STATUS[opt].short}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Sticky action bar so Save is always in reach on a phone */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:left-(--sidebar-width)">
        <div className="mx-auto flex max-w-[1300px] flex-wrap items-center gap-3">
          {message && (
            <p role={message.ok ? "status" : "alert"} className={cn("text-sm font-semibold", message.ok ? "text-primary" : "text-destructive")}>
              {message.text}
            </p>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {canSms && taken && savedAbsentNotTexted > 0 && !dirty && (
              <Button variant="outline" disabled={texting} onClick={sms} className="h-11 gap-2 rounded-full px-5 font-bold">
                {texting ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareText className="size-4" />}
                SMS {savedAbsentNotTexted} {savedAbsentNotTexted === 1 ? "guardian" : "guardians"}
              </Button>
            )}
            <Button disabled={saving || (!dirty && taken)} onClick={save} className="h-11 gap-2 rounded-full px-6 font-bold">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {taken ? (dirty ? "Save changes" : "Saved") : "Save attendance"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

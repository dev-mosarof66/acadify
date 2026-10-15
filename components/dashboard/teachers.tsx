"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, UserRoundCog, X } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/components/super-admin/ui";
import { FormError, SHIFT_LABELS } from "@/components/dashboard/form-bits";
import { setSectionTeacher } from "@/lib/institute/attendance-actions";
import type { SectionAssignment } from "@/lib/institute/attendance-queries";
import { cn } from "@/lib/utils";

export type TeacherOption = { memberId: string; name: string; roleLabel: string };

function SectionRow({ section, staff, onError }: { section: SectionAssignment; staff: TeacherOption[]; onError: (m: string) => void }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const byId = new Map(staff.map((s) => [s.memberId, s]));
  const assigned = new Set(section.teachers.map((t) => t.memberId));
  const options = staff.filter((s) => !assigned.has(s.memberId)).map((s) => ({ value: s.memberId, label: `${s.name} · ${s.roleLabel}` }));

  const change = (memberId: string, assign: boolean, isClassTeacher = false) =>
    startTransition(async () => {
      const r = await setSectionTeacher(section.sectionId, memberId, assign, isClassTeacher);
      if (!r.ok) onError(r.error);
      router.refresh();
    });

  return (
    <li className="grid gap-3 px-5 py-4 lg:grid-cols-[220px_minmax(0,1fr)_240px] lg:items-center">
      <div>
        <p className="font-bold">
          {section.className} · {section.sectionName}
        </p>
        <p className="text-[13px] text-muted-foreground">{SHIFT_LABELS[section.shift]} shift</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {section.teachers.length === 0 && <span className="text-sm text-muted-foreground">No teacher yet</span>}
        {section.teachers.map((t) => {
          const person = byId.get(t.memberId);
          if (!person) return null;
          return (
            <span
              key={t.memberId}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-[13px] font-semibold",
                t.isClassTeacher ? "border-primary/40 bg-primary-light text-primary" : "bg-card"
              )}
            >
              {person.name}
              <button
                type="button"
                disabled={pending}
                onClick={() => change(t.memberId, true, !t.isClassTeacher)}
                aria-pressed={t.isClassTeacher}
                aria-label={t.isClassTeacher ? `${person.name} is the class teacher. Tap to unset.` : `Make ${person.name} the class teacher`}
                title={t.isClassTeacher ? "Class teacher" : "Make class teacher"}
                className="grid size-6 cursor-pointer place-items-center rounded-full hover:bg-primary/10"
              >
                <Star className={cn("size-3.5", t.isClassTeacher && "fill-current")} />
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => change(t.memberId, false)}
                aria-label={`Remove ${person.name} from this section`}
                className="grid size-6 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-danger-light hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </span>
          );
        })}
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      <Select value={null} onValueChange={(v) => v && change(v as string, true, section.teachers.length === 0)} items={options} disabled={!options.length || pending}>
        <SelectTrigger aria-label={`Assign a teacher to ${section.className} ${section.sectionName}`} className="h-10 w-full rounded-xl bg-card dark:bg-card">
          <SelectValue placeholder={options.length ? "Assign a teacher" : "Everyone is assigned"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  );
}

export function TeacherAssignments({ sections, staff }: { sections: SectionAssignment[]; staff: TeacherOption[] }) {
  const [error, setError] = React.useState<string>();

  if (!sections.length || !staff.length) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <UserRoundCog className="size-8 text-muted-foreground" />
          <p className="font-bold">{!sections.length ? "No sections yet" : "No teachers yet"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {!sections.length ? "Add classes and sections under Classes first." : "Give your teachers access under Staff, then assign them here."}
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <FormError>{error}</FormError>
      <Panel>
        <ul className="divide-y divide-border">
          {sections.map((s) => (
            <SectionRow key={s.sectionId} section={s} staff={staff} onError={setError} />
          ))}
        </ul>
      </Panel>
      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Star className="size-3.5" />
        marks the class teacher. The first teacher you assign to a section becomes its class teacher.
      </p>
    </>
  );
}


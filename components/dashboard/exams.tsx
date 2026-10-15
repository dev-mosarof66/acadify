"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Check, Eye, EyeOff, Loader2, Pencil, Plus, Printer, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import { deleteExam, deleteSubject, saveExam, saveMarks, saveSubject, setExamPublished, type ExamResult } from "@/lib/exams/actions";
import { SCALE_LABELS, type GradingScale } from "@/lib/exams/grading";
import type { ExamView, SubjectView } from "@/lib/exams/queries";
import type { ClassView } from "@/lib/institute/queries";
import { GROUP_LABELS, STUDY_GROUPS, subjectApplies, type StudyGroup } from "@/lib/ui/labels";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- exams */

const SCALE_ITEMS = (Object.keys(SCALE_LABELS) as GradingScale[]).map((s) => ({ value: s, label: SCALE_LABELS[s] }));

function ExamDialog({ exam, onClose }: { exam?: ExamView; onClose: () => void }) {
  const router = useRouter();
  const [scale, setScale] = React.useState<GradingScale>(exam?.gradingScale ?? "gpa5");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("gradingScale", scale);
    if (exam) form.set("id", exam.id);
    startTransition(async () => {
      const r = await saveExam(form);
      if (!r.ok) return setError({ message: r.error, field: r.field });
      onClose();
      if (exam) router.refresh();
      else router.push(`/dashboard/exams/${r.id}`);
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{exam ? `Edit ${exam.name}` : "New exam"}</DialogTitle>
          <DialogDescription>Every class sits it, with the subjects set for that class.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError>{error?.message}</FormError>
          <div className="grid gap-2">
            <FieldLabel htmlFor="exam-name">Name</FieldLabel>
            <Input id="exam-name" name="name" autoFocus defaultValue={exam?.name} placeholder="e.g. Half-yearly 2026" className={CONTROL} aria-invalid={error?.field === "name" || undefined} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="exam-startsOn" optional>
                Starts on
              </FieldLabel>
              <Input id="exam-startsOn" name="startsOn" type="date" defaultValue={exam?.startsOn ?? ""} className={CONTROL} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="exam-scale">Grading</FieldLabel>
              <Select value={scale} onValueChange={(v) => v && setScale(v as GradingScale)} items={SCALE_ITEMS}>
                <SelectTrigger id="exam-scale" className={`${CONTROL} w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCALE_ITEMS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {exam ? "Save" : "Create exam"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewExamButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        New exam
      </Button>
      {open && <ExamDialog onClose={() => setOpen(false)} />}
    </>
  );
}

export function ExamAdminActions({ exam }: { exam: ExamView }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const run = (fn: () => Promise<ExamResult>, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error);
      after?.();
      router.refresh();
    });

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setEditing(true)} className="h-10 gap-2 rounded-full px-4 font-bold">
          <Pencil className="size-4" />
          Edit
        </Button>
        <Button variant={exam.published ? "outline" : "default"} disabled={pending} onClick={() => run(() => setExamPublished(exam.id, !exam.published))} className="h-10 gap-2 rounded-full px-4 font-bold">
          {pending ? <Loader2 className="size-4 animate-spin" /> : exam.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {exam.published ? "Unpublish results" : "Publish results"}
        </Button>
        {exam.marksEntered === 0 && (
          <Button variant="ghost" disabled={pending} onClick={() => run(() => deleteExam(exam.id), () => router.push("/dashboard/exams"))} className="h-10 gap-2 rounded-full px-4 font-bold text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
            Delete
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
      {editing && <ExamDialog exam={exam} onClose={() => setEditing(false)} />}
    </div>
  );
}

export function ExamsList({ exams }: { exams: ExamView[] }) {
  if (!exams.length) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <Award className="size-8 text-muted-foreground" />
          <p className="font-bold">No exams yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Set each class&apos;s subjects first, then create an exam. Teachers enter marks for their sections.</p>
        </div>
      </Panel>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {exams.map((e) => (
        <li key={e.id}>
          <Link href={`/dashboard/exams/${e.id}`} className="block h-full">
            <Panel className="h-full transition-colors hover:ring-primary/40">
              <div className="grid gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-extrabold">{e.name}</p>
                  {e.published ? (
                    <Badge className="h-6 rounded-full bg-primary-light px-2.5 text-[11.5px] font-bold text-primary">Published</Badge>
                  ) : (
                    <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-[11.5px] font-bold">Draft</Badge>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {SCALE_LABELS[e.gradingScale]} · {e.marksEntered.toLocaleString("en-IN")} marks entered
                </p>
              </div>
            </Panel>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- subjects */

const SUBJECT_AUDIENCE = [{ value: "all", label: "Everyone in the class (common)" }, ...STUDY_GROUPS.map((g) => ({ value: g, label: `${GROUP_LABELS[g]} group only` }))];

function SubjectDialog({ cls, subject, onClose }: { cls: ClassView; subject?: SubjectView; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();
  const [group, setGroup] = React.useState<string>(subject?.group ?? "all");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("classId", cls.id);
    form.set("group", group === "all" ? "" : group);
    if (subject) form.set("id", subject.id);
    startTransition(async () => {
      const r = await saveSubject(form);
      if (!r.ok) return setError({ message: r.error, field: r.field });
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subject ? `Edit ${subject.name}` : `New subject for ${cls.name}`}</DialogTitle>
          <DialogDescription>Marks are checked against these when teachers enter them.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError>{error?.message}</FormError>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="subject-name">Subject</FieldLabel>
              <Input id="subject-name" name="name" autoFocus defaultValue={subject?.name} placeholder="e.g. Bangla, Quran" className={CONTROL} aria-invalid={error?.field === "name" || undefined} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="subject-nameBn" optional>
                In Bangla
              </FieldLabel>
              <Input id="subject-nameBn" name="nameBn" lang="bn" defaultValue={subject?.nameBn} className={CONTROL} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="subject-full">Full marks</FieldLabel>
              <Input id="subject-full" name="fullMarks" inputMode="numeric" defaultValue={subject?.fullMarks ?? 100} className={CONTROL} aria-invalid={error?.field === "fullMarks" || undefined} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="subject-pass">Pass marks</FieldLabel>
              <Input id="subject-pass" name="passMarks" inputMode="numeric" defaultValue={subject?.passMarks ?? 33} className={CONTROL} aria-invalid={error?.field === "passMarks" || undefined} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <FieldLabel htmlFor="subject-group">Taught to</FieldLabel>
              <Select value={group} onValueChange={(v) => setGroup((v as string) ?? "all")} items={SUBJECT_AUDIENCE}>
                <SelectTrigger id="subject-group" className={`${CONTROL} w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_AUDIENCE.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[12.5px] text-muted-foreground">Common subjects go to every student in the class. Group subjects only to students of that group.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {subject ? "Save" : "Add subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "7 common · Science 3 · Commerce 3" plus what each group's student sits in total. */
function subjectSummary(list: SubjectView[]) {
  const common = list.filter((s) => s.group === null);
  const groups = STUDY_GROUPS.filter((g) => list.some((s) => s.group === g));
  if (!groups.length) return `${list.length} subjects · ${list.reduce((n, s) => n + s.fullMarks, 0)} marks in total`;
  const commonMarks = common.reduce((n, s) => n + s.fullMarks, 0);
  return [
    `${common.length} common (${commonMarks} marks)`,
    ...groups.map((g) => {
      const own = list.filter((s) => s.group === g);
      return `${GROUP_LABELS[g]} +${own.length} (${commonMarks + own.reduce((n, s) => n + s.fullMarks, 0)} marks in total)`;
    }),
  ].join(" · ");
}

export function SubjectsBoard({ classes, subjects }: { classes: ClassView[]; subjects: SubjectView[] }) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<{ cls: ClassView; subject?: SubjectView } | null>(null);
  const [error, setError] = React.useState<string>();
  const [, startTransition] = React.useTransition();

  if (!classes.length) {
    return (
      <Panel>
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Add classes first, under Classes.</p>
      </Panel>
    );
  }

  return (
    <>
      <FormError>{error}</FormError>
      <div className="grid gap-4">
        {classes.map((c) => {
          const list = subjects.filter((s) => s.classId === c.id);
          return (
            <Panel key={c.id}>
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <p className="font-extrabold">{c.name}</p>
                  <p className="text-[13px] text-muted-foreground">{list.length ? subjectSummary(list) : "No subjects yet"}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDialog({ cls: c })} className="gap-1.5 rounded-full px-3 font-bold">
                  <Plus className="size-3.5" />
                  Subject
                </Button>
              </div>
              {list.length > 0 && (
                <ul className="flex flex-wrap gap-2 p-4">
                  {list.map((s) => (
                    <li key={s.id} className="inline-flex items-center gap-1 rounded-full border bg-card py-1 pr-1 pl-3 text-[13px]">
                      <span className="font-semibold">{s.name}</span>
                      {s.group && <span className="rounded-full bg-primary-light px-2 text-[11.5px] font-bold text-primary">{GROUP_LABELS[s.group]}</span>}
                      <span className="text-muted-foreground">
                        {s.passMarks}/{s.fullMarks}
                      </span>
                      <button type="button" onClick={() => setDialog({ cls: c, subject: s })} aria-label={`Edit ${s.name}`} className="grid size-6 cursor-pointer place-items-center rounded-full hover:bg-secondary">
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            const r = await deleteSubject(s.id);
                            if (!r.ok) setError(r.error);
                            router.refresh();
                          })
                        }
                        aria-label={`Delete ${s.name}`}
                        className="grid size-6 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-danger-light hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>
      {dialog && <SubjectDialog key={dialog.subject?.id ?? dialog.cls.id} cls={dialog.cls} subject={dialog.subject} onClose={() => setDialog(null)} />}
    </>
  );
}

/* ---------------------------------------------------------------- exam sections */

export function ExamSections({
  examId,
  sections,
  enterable,
}: {
  examId: string;
  sections: { sectionId: string; className: string; sectionName: string; students: number; subjects: number; entered: number; needed: number }[];
  /** Sections this person may enter marks for. */
  enterable: string[];
}) {
  if (!sections.length) {
    return (
      <Panel>
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">No sections to show. Teachers see the sections they&apos;re assigned to.</p>
      </Panel>
    );
  }
  return (
    <Panel>
      <ul className="divide-y divide-border">
        {sections.map((s) => {
          const pct = s.needed ? Math.round((s.entered / s.needed) * 100) : 0;
          return (
            <li key={s.sectionId} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-[180px] flex-1">
                <p className="font-bold">
                  {s.className} · {s.sectionName}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {s.subjects ? `${s.students} students · ${s.subjects} subjects` : "No subjects set for this class"}
                </p>
              </div>
              <div className="w-40">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full", pct >= 100 ? "bg-primary" : "bg-warning")} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">
                  {s.entered} of {s.needed} marks
                </p>
              </div>
              <div className="flex gap-2">
                {enterable.includes(s.sectionId) && s.subjects > 0 && (
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/exams/${examId}/${s.sectionId}`} />} className="rounded-full px-3 font-bold">
                    Enter marks
                  </Button>
                )}
                {s.entered > 0 && (
                  <Button size="sm" nativeButton={false} render={<Link href={`/dashboard/exams/${examId}/${s.sectionId}/results`} />} className="rounded-full px-3 font-bold">
                    Results
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ---------------------------------------------------------------- marks sheet */

type Cell = { marks: string; absent: boolean };

export function MarksSheet({
  examId,
  sectionId,
  subjects,
  students,
  marks,
  locked,
}: {
  examId: string;
  sectionId: string;
  subjects: { id: string; name: string; fullMarks: number; passMarks: number; group: StudyGroup | null }[];
  students: { id: string; name: string; roll: number; group: StudyGroup | null }[];
  marks: Record<string, { marks: number | null; absent: boolean }>;
  locked: boolean;
}) {
  const router = useRouter();
  const [cells, setCells] = React.useState<Record<string, Cell>>(() => {
    const init: Record<string, Cell> = {};
    for (const st of students) for (const sub of subjects) {
      if (!subjectApplies(sub.group, st.group)) continue;
      const m = marks[`${st.id}:${sub.id}`];
      init[`${st.id}:${sub.id}`] = { marks: m?.marks === null || m?.marks === undefined ? "" : String(m.marks), absent: m?.absent ?? false };
    }
    return init;
  });
  const [message, setMessage] = React.useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = React.useTransition();

  const set = (key: string, v: Partial<Cell>) => {
    setCells((c) => ({ ...c, [key]: { ...c[key], ...v } }));
    setMessage(undefined);
  };

  const save = () => {
    const entries = Object.entries(cells).map(([key, c]) => {
      const [studentId, subjectId] = key.split(":");
      const n = c.marks.trim() === "" ? null : Number(c.marks.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))));
      return { studentId, subjectId, marks: n, absent: c.absent };
    });
    const bad = entries.find((e) => e.marks !== null && (!Number.isInteger(e.marks) || e.marks < 0));
    if (bad) return setMessage({ ok: false, text: "Marks must be whole numbers." });
    startTransition(async () => {
      const r = await saveMarks(examId, sectionId, entries);
      setMessage(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  };

  if (!students.length) return <Panel><p className="px-5 py-10 text-center text-sm text-muted-foreground">No active students in this section.</p></Panel>;

  return (
    <div className="grid gap-4 pb-24">
      {locked && <p className="rounded-xl bg-warning-light px-4 py-3 text-sm font-semibold text-accent-foreground dark:text-warning">Results are published, so marks are locked.</p>}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-bold text-muted-foreground">Student</th>
                {subjects.map((s) => (
                  <th key={s.id} className="px-2 py-3 text-center font-bold text-muted-foreground">
                    {s.name}
                    {s.group && <span className="block text-[11px] font-bold text-primary">{GROUP_LABELS[s.group]}</span>}
                    <span className="block text-[11px] font-semibold">
                      pass {s.passMarks} / {s.fullMarks}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 bg-card px-4 py-2">
                    <span className="mr-2 font-extrabold tabular-nums">{st.roll}</span>
                    <span className="font-semibold">{st.name}</span>
                    {st.group && <span className="ml-2 text-[11.5px] font-bold text-primary">{GROUP_LABELS[st.group]}</span>}
                  </td>
                  {subjects.map((sub) => {
                    if (!subjectApplies(sub.group, st.group)) {
                      return (
                        <td key={sub.id} className="bg-secondary/50 px-2 py-2 text-center text-muted-foreground" aria-label={`${sub.name} is not taken by ${st.name}`}>
                          —
                        </td>
                      );
                    }
                    const key = `${st.id}:${sub.id}`;
                    const c = cells[key];
                    const n = Number(c.marks);
                    const fail = c.absent || (c.marks !== "" && n < sub.passMarks);
                    const over = c.marks !== "" && n > sub.fullMarks;
                    return (
                      <td key={sub.id} className="px-2 py-2 text-center">
                        <div className="inline-flex items-center gap-1">
                          <Input
                            inputMode="numeric"
                            aria-label={`${st.name}, ${sub.name}`}
                            value={c.absent ? "" : c.marks}
                            disabled={c.absent || locked}
                            onChange={(e) => set(key, { marks: e.target.value })}
                            placeholder={c.absent ? "Abs" : "—"}
                            className={cn("h-9 w-16 rounded-lg bg-background text-center tabular-nums", (fail || over) && "border-destructive text-destructive")}
                          />
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => set(key, { absent: !c.absent, marks: "" })}
                            aria-pressed={c.absent}
                            title="Absent"
                            className={cn("h-9 cursor-pointer rounded-lg border px-1.5 text-[11px] font-bold", c.absent ? "border-destructive bg-danger-light text-destructive" : "text-muted-foreground hover:text-foreground")}
                          >
                            Abs
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {!locked && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:left-(--sidebar-width)">
          <div className="mx-auto flex max-w-[1300px] flex-wrap items-center gap-3">
            {message && <p role={message.ok ? "status" : "alert"} className={cn("text-sm font-semibold", message.ok ? "text-primary" : "text-destructive")}>{message.text}</p>}
            <Button disabled={pending} onClick={save} className="ml-auto h-11 gap-2 rounded-full px-6 font-bold">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Save marks
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PrintPageButton({ label = "Print" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} variant="outline" className="h-10 gap-2 rounded-full px-4 font-bold print:hidden">
      <Printer className="size-4" />
      {label}
    </Button>
  );
}


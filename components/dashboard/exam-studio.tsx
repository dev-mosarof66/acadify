"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Pencil, Printer, RotateCcw, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import { QuestionPaper } from "@/components/dashboard/question-paper";
import { approvePaper, createPaperJob, rejectPaper, retryPaperJob, type AiResult } from "@/lib/ai/actions";
import { CQ_PARTS, DIFFICULTIES, LANGUAGES, SET_NAMES, totalMarks, type Paper } from "@/lib/ai/paper";
import type { PaperJob, PaperJobRow, PaperJobStatus } from "@/lib/ai/queries";
import type { SubjectView } from "@/lib/exams/queries";
import type { ClassView } from "@/lib/institute/queries";
import type { SheetRow } from "@/lib/sheets/queries";
import { formatDate } from "@/lib/super-admin/data";
import { GROUP_LABELS } from "@/lib/ui/labels";
import { cn } from "@/lib/utils";

const STATUS: Record<PaperJobStatus, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-secondary text-secondary-foreground" },
  running: { label: "Writing…", className: "bg-primary-light text-primary" },
  awaiting_approval: { label: "Needs review", className: "bg-warning-light text-warning" },
  approved: { label: "Approved", className: "bg-success-light text-success" },
  rejected: { label: "Rejected", className: "bg-secondary text-muted-foreground" },
  failed: { label: "Failed", className: "bg-danger-light text-destructive" },
};

export function PaperStatusBadge({ status }: { status: PaperJobStatus }) {
  return <Badge className={cn("rounded-full font-bold", STATUS[status].className)}>{STATUS[status].label}</Badge>;
}

/* ---------------------------------------------------------------- new paper */

/** Sheets the AI can read as source material. */
const READABLE = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);

function SelectField({ id, label, value, onChange, items, invalid }: { id: string; label: string; value: string; onChange: (v: string) => void; items: { value: string; label: string }[]; invalid?: boolean }) {
  return (
    <div className="grid gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={(v) => v !== null && onChange(String(v))} items={items}>
        <SelectTrigger id={id} className={`${CONTROL} w-full`} aria-invalid={invalid || undefined}>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumberField({ id, label, defaultValue, invalid, onChange }: { id: string; label: string; defaultValue: number; invalid?: boolean; onChange?: (n: number) => void }) {
  return (
    <div className="grid gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} name={id} inputMode="numeric" defaultValue={defaultValue} onChange={(e) => onChange?.(Number(e.target.value))} className={CONTROL} aria-invalid={invalid || undefined} />
    </div>
  );
}

function NewPaperDialog({ classes, subjects, sheets, onClose }: { classes: ClassView[]; subjects: SubjectView[]; sheets: SheetRow[]; onClose: () => void }) {
  const router = useRouter();
  const [classId, setClassId] = React.useState(classes.length === 1 ? classes[0].id : "");
  const [subjectId, setSubjectId] = React.useState("");
  const [language, setLanguage] = React.useState("bn");
  const [difficulty, setDifficulty] = React.useState("balanced");
  const [sets, setSets] = React.useState("4");
  const [sheetIds, setSheetIds] = React.useState<string[]>([]);
  const [counts, setCounts] = React.useState({ cqToAnswer: 7, mcqCount: 30 });
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const classItems = classes.map((c) => ({ value: c.id, label: c.name }));
  const subjectItems = subjects.filter((s) => s.classId === classId).map((s) => ({ value: s.id, label: s.group ? `${s.name} (${GROUP_LABELS[s.group]})` : s.name }));
  const classSheets = sheets.filter((s) => s.classId === classId && READABLE.has(s.contentType) && (!subjectId || !s.subjectId || s.subjectId === subjectId));
  const marks = totalMarks({ cqToAnswer: Number.isFinite(counts.cqToAnswer) ? counts.cqToAnswer : 0, mcqCount: Number.isFinite(counts.mcqCount) ? counts.mcqCount : 0 });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("subjectId", subjectId);
    form.set("language", language);
    form.set("difficulty", difficulty);
    form.set("sets", sets);
    form.delete("sheetIds");
    sheetIds.forEach((id) => form.append("sheetIds", id));
    setError(undefined);
    startTransition(async () => {
      const r = await createPaperJob(form);
      if (!r.ok) return setError({ message: r.error, field: r.field });
      onClose();
      router.push(`/dashboard/exam-studio/${r.id}`);
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New question paper</DialogTitle>
          <DialogDescription>AI writes a draft in about a minute. You review and edit every question before anything is printed.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError>{error?.message}</FormError>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="paper-class"
              label="Class"
              value={classId}
              onChange={(v) => {
                setClassId(v);
                setSubjectId("");
                setSheetIds([]);
              }}
              items={classItems}
            />
            <SelectField id="paper-subject" label="Subject" value={subjectId} onChange={setSubjectId} items={subjectItems} invalid={error?.field === "subjectId"} />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="examName">Exam</FieldLabel>
            <Input id="examName" name="examName" placeholder="e.g. Half-yearly 2026" className={CONTROL} aria-invalid={error?.field === "examName" || undefined} />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="chapters">Chapters or topics</FieldLabel>
            <Textarea id="chapters" name="chapters" rows={2} placeholder="e.g. Chapter 3 Motion, Chapter 4 Force, Chapter 5 Work and energy" className="rounded-xl bg-card dark:bg-card" aria-invalid={error?.field === "chapters" || undefined} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberField id="cqCount" label="Creative questions" defaultValue={11} invalid={error?.field === "cqCount"} />
            <NumberField id="cqToAnswer" label="Students answer" defaultValue={7} invalid={error?.field === "cqToAnswer"} onChange={(n) => setCounts((c) => ({ ...c, cqToAnswer: n }))} />
            <NumberField id="mcqCount" label="MCQs" defaultValue={30} invalid={error?.field === "mcqCount"} onChange={(n) => setCounts((c) => ({ ...c, mcqCount: n }))} />
            <NumberField id="minutes" label="Minutes" defaultValue={180} invalid={error?.field === "minutes"} />
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">Full marks: {marks} (each creative question 10, each MCQ 1)</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField id="paper-language" label="Language" value={language} onChange={setLanguage} items={Object.entries(LANGUAGES).map(([value, label]) => ({ value, label }))} />
            <SelectField id="paper-difficulty" label="Difficulty" value={difficulty} onChange={setDifficulty} items={Object.entries(DIFFICULTIES).map(([value, label]) => ({ value, label }))} />
            <SelectField
              id="paper-sets"
              label="Sets"
              value={sets}
              onChange={setSets}
              items={[1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 1 ? "1 set" : `${n} sets (${SET_NAMES.slice(0, n).map((s) => s.en).join(", ")})` }))}
            />
          </div>
          {classId && (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-bold">
                Lecture sheets to write from <span className="font-medium text-muted-foreground">(optional, up to 5 PDFs or photos)</span>
              </legend>
              {classSheets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No PDF or photo sheets for this class yet. The AI will write from the chapters you listed.</p>
              ) : (
                <div className="grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-border p-3">
                  {classSheets.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={sheetIds.includes(s.id)}
                        disabled={!sheetIds.includes(s.id) && sheetIds.length >= 5}
                        onCheckedChange={(v) => setSheetIds((ids) => (v ? [...ids, s.id] : ids.filter((x) => x !== s.id)))}
                      />
                      <span className="min-w-0 truncate">{s.title}</span>
                      {s.subjectName && <span className="shrink-0 text-muted-foreground">· {s.subjectName}</span>}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}
          <div className="grid gap-2">
            <FieldLabel htmlFor="notes" optional>
              Notes for the AI
            </FieldLabel>
            <Textarea id="notes" name="notes" rows={2} placeholder="e.g. Include one numerical CQ on velocity-time graphs" className="rounded-xl bg-card dark:bg-card" />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Write the paper
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewPaperButton(props: { classes: ClassView[]; subjects: SubjectView[]; sheets: SheetRow[]; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={props.disabled} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Sparkles className="size-4" />
        New question paper
      </Button>
      {open && <NewPaperDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ---------------------------------------------------------------- list */

export function PaperJobsList({ jobs }: { jobs: PaperJobRow[] }) {
  if (!jobs.length) {
    return (
      <Panel className="grid justify-items-center gap-2 p-10 text-center">
        <Sparkles className="size-8 text-primary" />
        <p className="font-bold">No question papers yet</p>
        <p className="max-w-md text-sm text-muted-foreground">Pick a class, subject and chapters, and AI drafts a board-pattern paper with creative questions, MCQs, answer key and sets.</p>
      </Panel>
    );
  }
  return (
    <Panel>
      <PanelHeader title="Question papers" description="Drafts stay private until a teacher approves them" />
      <ul className="divide-y divide-border">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link href={`/dashboard/exam-studio/${j.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/50">
              <div className="min-w-0">
                <p className="truncate font-bold">{j.title}</p>
                <p className="text-[13px] text-muted-foreground">
                  {j.requestedByName} · {formatDate(j.createdAt)}
                </p>
              </div>
              <PaperStatusBadge status={j.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ---------------------------------------------------------------- one paper */

/** Refreshes the page every few seconds while the AI is writing. */
export function WritingProgress() {
  const router = useRouter();
  React.useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <Panel className="grid justify-items-center gap-3 p-10 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-bold">Writing the paper…</p>
      <p className="max-w-md text-sm text-muted-foreground">This usually takes one to three minutes. You can leave this page; the draft will be waiting here.</p>
    </Panel>
  );
}

export function RetryButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  return (
    <div className="grid justify-items-start gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await retryPaperJob(jobId);
            if (!r.ok) return setError(r.error);
            router.refresh();
          })
        }
        className="h-10 gap-2 rounded-full px-4 font-bold"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
        Try again
      </Button>
      {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}

const TEXTAREA = "min-h-0 rounded-xl bg-card text-[14px] dark:bg-card";

/** Every question as editable fields. */
function PaperEditor({ paper, onChange, optionLabels }: { paper: Paper; onChange: (p: Paper) => void; optionLabels: readonly string[] }) {
  const setCq = (i: number, q: Paper["cq"][number]) => onChange({ ...paper, cq: paper.cq.map((x, k) => (k === i ? q : x)) });
  const setMcq = (i: number, q: Paper["mcq"][number]) => onChange({ ...paper, mcq: paper.mcq.map((x, k) => (k === i ? q : x)) });

  return (
    <div className="grid gap-6">
      {paper.cq.length > 0 && (
        <Panel>
          <PanelHeader title="Creative questions" description="Stimulus, the four parts and each part's marking guide" />
          <ol className="divide-y divide-border">
            {paper.cq.map((q, i) => (
              <li key={i} className="grid gap-3 px-5 py-4">
                <p className="text-sm font-extrabold">CQ {i + 1}</p>
                <Textarea aria-label={`CQ ${i + 1} stimulus`} rows={3} value={q.stimulus} onChange={(e) => setCq(i, { ...q, stimulus: e.target.value })} className={TEXTAREA} />
                {q.parts.map((p, j) => (
                  <div key={j} className="grid gap-2 ps-4">
                    <p className="text-[13px] font-bold text-muted-foreground">
                      {CQ_PARTS[j]?.key} · {CQ_PARTS[j]?.level} · {CQ_PARTS[j]?.marks} marks
                    </p>
                    <Textarea aria-label={`CQ ${i + 1} part ${CQ_PARTS[j]?.key}`} rows={1} value={p.question} onChange={(e) => setCq(i, { ...q, parts: q.parts.map((x, k) => (k === j ? { ...x, question: e.target.value } : x)) })} className={TEXTAREA} />
                    <Textarea aria-label={`CQ ${i + 1} part ${CQ_PARTS[j]?.key} marking guide`} rows={1} value={p.answerGuide} onChange={(e) => setCq(i, { ...q, parts: q.parts.map((x, k) => (k === j ? { ...x, answerGuide: e.target.value } : x)) })} className={cn(TEXTAREA, "text-muted-foreground")} />
                  </div>
                ))}
              </li>
            ))}
          </ol>
        </Panel>
      )}
      {paper.mcq.length > 0 && (
        <Panel>
          <PanelHeader title="MCQs" description="Tick the correct option" />
          <ol className="divide-y divide-border">
            {paper.mcq.map((q, i) => (
              <li key={i} className="grid gap-2 px-5 py-4">
                <p className="text-sm font-extrabold">MCQ {i + 1}</p>
                <Textarea aria-label={`MCQ ${i + 1} question`} rows={1} value={q.question} onChange={(e) => setMcq(i, { ...q, question: e.target.value })} className={TEXTAREA} />
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Checkbox aria-label={`Option ${optionLabels[j]} is correct`} checked={q.correctIndex === j} onCheckedChange={(v) => v && setMcq(i, { ...q, correctIndex: j })} />
                      <span className="w-4 text-sm font-bold">{optionLabels[j]}</span>
                      <Input aria-label={`MCQ ${i + 1} option ${optionLabels[j]}`} value={o} onChange={(e) => setMcq(i, { ...q, options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} className="h-9 rounded-lg bg-card text-[14px] dark:bg-card" />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}

/** The draft or approved paper, with review actions for the teacher who can decide. */
export function PaperReview({ job, instituteName, canDecide }: { job: PaperJob; instituteName: string; canDecide: boolean }) {
  const router = useRouter();
  const [paper, setPaper] = React.useState<Paper | null>(job.paper);
  const [editing, setEditing] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [message, setMessage] = React.useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = React.useTransition();
  if (!paper) return null;

  const awaiting = job.status === "awaiting_approval";
  const run = (fn: () => Promise<AiResult>) =>
    startTransition(async () => {
      const r = await fn();
      setMessage(r.ok ? (r.message ? { ok: true, text: r.message } : undefined) : { ok: false, text: r.error });
      if (r.ok) {
        setEditing(false);
        setRejecting(false);
        router.refresh();
      }
    });
  const optionLabels = job.params.language === "bn" ? ["ক", "খ", "গ", "ঘ"] : ["a", "b", "c", "d"];

  return (
    <div className="grid gap-6">
      {awaiting && job.warnings.length > 0 && (
        <div role="status" className="grid gap-1 rounded-2xl bg-warning-light px-5 py-4 text-sm">
          <p className="flex items-center gap-2 font-bold text-warning">
            <AlertTriangle className="size-4" />
            Check before approving
          </p>
          <ul className="list-disc ps-6">
            {job.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {(awaiting && canDecide) || job.status === "approved" ? (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {awaiting && canDecide && (
            <>
              <Button disabled={pending} onClick={() => run(() => approvePaper(job.id, paper))} className="h-10 gap-2 rounded-full px-4 font-bold">
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {editing ? "Save and approve" : "Approve"}
              </Button>
              <Button variant="outline" disabled={pending} onClick={() => setEditing((e) => !e)} className="h-10 gap-2 rounded-full px-4 font-bold">
                <Pencil className="size-4" />
                {editing ? "Preview" : "Edit questions"}
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => setRejecting(true)} className="h-10 gap-2 rounded-full px-4 font-bold text-destructive hover:text-destructive">
                <X className="size-4" />
                Reject
              </Button>
            </>
          )}
          {job.status === "approved" && (
            <>
              {SET_NAMES.slice(0, job.params.sets).map((s, i) => (
                <Button key={s.en} variant="outline" nativeButton={false} render={<Link href={`/dashboard/exam-studio/${job.id}/print?set=${i}`} />} className="h-10 gap-2 rounded-full px-4 font-bold">
                  <Printer className="size-4" />
                  {job.params.sets > 1 ? `Set ${s.en}` : "Print paper"}
                </Button>
              ))}
              {SET_NAMES.slice(0, job.params.sets).map((s, i) => (
                <Button key={`key-${s.en}`} variant="ghost" nativeButton={false} render={<Link href={`/dashboard/exam-studio/${job.id}/print?set=${i}&key=1`} />} className="h-10 gap-2 rounded-full px-4 font-bold">
                  {job.params.sets > 1 ? `Answer key ${s.en}` : "Answer key"}
                </Button>
              ))}
            </>
          )}
        </div>
      ) : null}
      {message && (
        <p role={message.ok ? "status" : "alert"} className={cn("text-sm font-semibold", message.ok ? "text-success" : "text-destructive")}>
          {message.text}
        </p>
      )}

      {editing ? <PaperEditor paper={paper} onChange={setPaper} optionLabels={optionLabels} /> : <QuestionPaper paper={paper} params={job.params} instituteName={instituteName} answerKey={awaiting} />}

      {rejecting && (
        <Dialog open onOpenChange={(o) => !o && setRejecting(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reject this paper?</DialogTitle>
              <DialogDescription>It won&apos;t be printed and its questions won&apos;t go into the question bank. You can make a new paper any time.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <FieldLabel htmlFor="reject-note" optional>
                Why
              </FieldLabel>
              <Textarea id="reject-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Questions are above Class 9 level" className="rounded-xl bg-card dark:bg-card" />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
              <Button variant="destructive" disabled={pending} onClick={() => run(() => rejectPaper(job.id, note))} className="gap-2 rounded-full px-5 font-bold">
                {pending && <Loader2 className="size-4 animate-spin" />}
                Reject paper
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

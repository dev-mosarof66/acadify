"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Image as ImageIcon, Loader2, Search, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import type { SubjectView } from "@/lib/exams/queries";
import type { ClassView } from "@/lib/institute/queries";
import { deleteSheet, uploadSheet } from "@/lib/sheets/actions";
import type { SheetRow } from "@/lib/sheets/queries";
import { formatDate } from "@/lib/super-admin/data";

const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function UploadDialog({ classes, subjects, onClose }: { classes: ClassView[]; subjects: SubjectView[]; onClose: () => void }) {
  const router = useRouter();
  const [classId, setClassId] = React.useState(classes.length === 1 ? classes[0].id : "");
  const [subjectId, setSubjectId] = React.useState("");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();
  const classItems = classes.map((c) => ({ value: c.id, label: c.name }));
  const subjectItems = [{ value: "", label: "Any subject" }, ...subjects.filter((s) => s.classId === classId).map((s) => ({ value: s.id, label: s.name }))];

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("classId", classId);
    form.set("subjectId", subjectId);
    setError(undefined);
    startTransition(async () => {
      const r = await uploadSheet(form);
      if (!r.ok) return setError({ message: r.error, field: r.field });
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a lecture sheet</DialogTitle>
          <DialogDescription>PDF, Word, PowerPoint, JPG or PNG, up to 10 MB. Students of the class can download it once they have access.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError>{error?.message}</FormError>
          <div className="grid gap-2">
            <FieldLabel htmlFor="sheet-title">Title</FieldLabel>
            <Input id="sheet-title" name="title" autoFocus placeholder="e.g. Chapter 3: Photosynthesis notes" className={CONTROL} aria-invalid={error?.field === "title" || undefined} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="sheet-class">Class</FieldLabel>
              <Select
                value={classId || null}
                onValueChange={(v) => {
                  setClassId((v as string) ?? "");
                  setSubjectId("");
                }}
                items={classItems}
              >
                <SelectTrigger id="sheet-class" className={`${CONTROL} w-full`}>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {classItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="sheet-subject" optional>
                Subject
              </FieldLabel>
              <Select value={subjectId} onValueChange={(v) => setSubjectId((v as string) ?? "")} items={subjectItems} disabled={!classId}>
                <SelectTrigger id="sheet-subject" className={`${CONTROL} w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjectItems.map((o) => (
                    <SelectItem key={o.value || "any"} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {classId && subjectItems.length === 1 && <p className="text-[12.5px] text-muted-foreground">This class has no subjects yet. The office adds them under Subjects.</p>}
            </div>
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="sheet-file">File</FieldLabel>
            <Input id="sheet-file" name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" className="h-11 rounded-xl bg-card pt-2 dark:bg-card" aria-invalid={error?.field === "file" || undefined} />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UploadSheetButton({ classes, subjects }: { classes: ClassView[]; subjects: SubjectView[] }) {
  const [open, setOpen] = React.useState(false);
  if (!classes.length) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Upload className="size-4" />
        Upload sheet
      </Button>
      {open && <UploadDialog classes={classes} subjects={subjects} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Lecture sheet library with class filter and search. `canRemove` decides the delete button per sheet. */
export function SheetsLibrary({ sheets, classes, removable }: { sheets: SheetRow[]; classes: { id: string; name: string }[]; removable: string[] }) {
  const router = useRouter();
  const [classId, setClassId] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string>();
  const query = q.trim().toLowerCase();
  const rows = sheets.filter((s) => (classId === "all" || s.classId === classId) && (!query || s.title.toLowerCase().includes(query) || (s.subjectName ?? "").toLowerCase().includes(query)));
  const classItems = [{ value: "all", label: "All classes" }, ...classes.map((c) => ({ value: c.id, label: c.name }))];

  if (!sheets.length) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <p className="font-bold">No lecture sheets yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Teachers can upload notes and handouts here for each class and subject.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex flex-wrap gap-2 border-b border-border p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or subject" aria-label="Search lecture sheets" className="h-10 rounded-xl bg-card pl-9 dark:bg-card" />
        </div>
        {classes.length > 1 && (
          <Select value={classId} onValueChange={(v) => setClassId((v as string) ?? "all")} items={classItems}>
            <SelectTrigger aria-label="Class" className="h-10 w-[180px] rounded-xl bg-card dark:bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {error && <p role="alert" className="border-b border-border bg-danger-light px-5 py-3 text-sm font-semibold text-destructive">{error}</p>}
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">No sheets match.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((s) => {
            const Icon = s.contentType.startsWith("image/") ? ImageIcon : FileText;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light">
                  <Icon className="size-5 text-primary" />
                </span>
                <div className="min-w-[200px] flex-1">
                  <p className="font-bold">{s.title}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {s.className}
                    {s.subjectName && ` · ${s.subjectName}`} · {size(s.sizeBytes)} · {s.uploadedByName}, {formatDate(s.createdAt)}
                  </p>
                </div>
                <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/api/sheets/${s.id}`} target="_blank" rel="noopener" />} className="gap-1.5 rounded-full px-3 font-bold">
                  <Download className="size-3.5" />
                  Open
                </Button>
                {removable.includes(s.id) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busy === s.id}
                    aria-label={`Remove ${s.title}`}
                    onClick={async () => {
                      setBusy(s.id);
                      const r = await deleteSheet(s.id);
                      setBusy(null);
                      if (!r.ok) return setError(r.error);
                      router.refresh();
                    }}
                    className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    {busy === s.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

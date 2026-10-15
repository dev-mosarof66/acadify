"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, GraduationCap, Loader2, LogOut, Pencil, Plus, RotateCcw, Search, SearchX, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError, SHIFT_LABELS } from "@/components/dashboard/form-bits";
import { saveStudent, setStudentStatus, uploadStudentPhoto } from "@/lib/institute/actions";
import type { ClassView, Gender, StudentRow, StudentStatus } from "@/lib/institute/queries";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => !/^(md\.?|mst\.?|mohammad|muhammad)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || name.slice(0, 1).toUpperCase();

const prettyPhone = (p: string) => p.replace(/^(01\d{3})(\d{6})$/, "$1-$2");

export function StudentAvatar({ student, className }: { student: Pick<StudentRow, "id" | "name" | "hasPhoto">; className?: string }) {
  return (
    <Avatar className={cn("size-10", className)}>
      {student.hasPhoto && <AvatarImage src={`/api/students/${student.id}/photo`} alt="" className="object-cover" />}
      <AvatarFallback className="bg-primary-light font-bold text-primary">{initials(student.name)}</AvatarFallback>
    </Avatar>
  );
}

const STATUS_META: Record<StudentStatus, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-primary-light text-primary" },
  left: { label: "Left", tone: "bg-secondary text-muted-foreground" },
  graduated: { label: "Graduated", tone: "bg-accent-light text-accent-foreground dark:text-accent" },
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  return <Badge className={cn("h-6 rounded-full px-2.5 text-[11.5px] font-bold", STATUS_META[status].tone)}>{STATUS_META[status].label}</Badge>;
}

/* ---------------------------------------------------------------- form */

const GENDER_ITEMS: { value: Gender; label: string }[] = [
  { value: "male", label: "Boy" },
  { value: "female", label: "Girl" },
];

/** "Class 6 · A (Day)" style labels for the section picker. */
const sectionLabel = (c: ClassView, s: ClassView["sections"][number]) => `Section ${s.name} · ${SHIFT_LABELS[s.shift]}${s.capacity ? ` (${s.students}/${s.capacity})` : ""}`;

export function StudentFormDialog({ classes, student, onClose }: { classes: ClassView[]; student?: StudentRow; onClose: () => void }) {
  const router = useRouter();
  const [classId, setClassId] = React.useState(student?.classId ?? (classes.length === 1 ? classes[0].id : ""));
  const cls = classes.find((c) => c.id === classId);
  const [sectionId, setSectionId] = React.useState(student?.sectionId ?? (cls?.sections.length === 1 ? cls.sections[0].id : ""));
  const [gender, setGender] = React.useState<Gender | "">(student?.gender ?? "");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const classItems = classes.map((c) => ({ value: c.id, label: c.name }));
  const sectionItems = (cls?.sections ?? []).map((s) => ({ value: s.id, label: sectionLabel(cls!, s) }));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("sectionId", sectionId);
    form.set("gender", gender);
    if (student) form.set("id", student.id);
    setError(undefined);
    startTransition(async () => {
      const r = await saveStudent(form);
      if (!r.ok) {
        setError({ message: r.error, field: r.field });
        if (r.field) document.getElementById(`student-${r.field}`)?.focus();
        return;
      }
      onClose();
      if (student) router.refresh();
      else router.push(`/dashboard/students/${r.id}`);
    });
  };

  const invalid = (f: string) => (error?.field === f ? { "aria-invalid": true as const, "aria-describedby": "student-error" } : {});

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student ? `Edit ${student.name}` : "Add a student"}</DialogTitle>
          <DialogDescription>
            {student ? `Student ID ${student.studentCode}` : "A student ID is given automatically. Leave the roll empty to use the next free roll."}
          </DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-5">
          <FormError id="student-error">{error?.message}</FormError>

          <fieldset className="grid gap-4">
            <legend className="mb-3 text-[12.5px] font-extrabold tracking-wide text-muted-foreground uppercase">Student</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <FieldLabel htmlFor="student-name">Name</FieldLabel>
                <Input id="student-name" name="name" autoFocus defaultValue={student?.name} placeholder="e.g. Abdullah Al Mamun" className={CONTROL} {...invalid("name")} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="student-nameBn" optional>
                  Name in Bangla
                </FieldLabel>
                <Input id="student-nameBn" name="nameBn" lang="bn" defaultValue={student?.nameBn} placeholder="যেমন আব্দুল্লাহ আল মামুন" className={CONTROL} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="student-gender">Boy or girl</FieldLabel>
                <Select value={gender || null} onValueChange={(v) => v && setGender(v as Gender)} items={GENDER_ITEMS}>
                  <SelectTrigger id="student-gender" className={`${CONTROL} w-full`} {...invalid("gender")}>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_ITEMS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="student-dateOfBirth" optional>
                  Date of birth
                </FieldLabel>
                <Input id="student-dateOfBirth" name="dateOfBirth" type="date" defaultValue={student?.dateOfBirth ?? ""} className={CONTROL} {...invalid("dateOfBirth")} />
              </div>
            </div>
          </fieldset>

          <fieldset className="grid gap-4">
            <legend className="mb-3 text-[12.5px] font-extrabold tracking-wide text-muted-foreground uppercase">Class</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <FieldLabel htmlFor="student-class">Class</FieldLabel>
                <Select
                  value={classId || null}
                  onValueChange={(v) => {
                    const next = classes.find((c) => c.id === v);
                    setClassId((v as string) ?? "");
                    setSectionId(next?.sections.length === 1 ? next.sections[0].id : "");
                  }}
                  items={classItems}
                >
                  <SelectTrigger id="student-class" className={`${CONTROL} w-full`}>
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
                <FieldLabel htmlFor="student-sectionId">Section</FieldLabel>
                <Select value={sectionId || null} onValueChange={(v) => setSectionId((v as string) ?? "")} items={sectionItems} disabled={!cls}>
                  <SelectTrigger id="student-sectionId" className={`${CONTROL} w-full`} {...invalid("sectionId")}>
                    <SelectValue placeholder={cls ? "Choose" : "Pick a class first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionItems.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="student-roll" optional>
                  Roll
                </FieldLabel>
                <Input id="student-roll" name="roll" inputMode="numeric" defaultValue={student?.roll ?? ""} placeholder="Next free" className={CONTROL} {...invalid("roll")} />
              </div>
            </div>
          </fieldset>

          <fieldset className="grid gap-4">
            <legend className="mb-3 text-[12.5px] font-extrabold tracking-wide text-muted-foreground uppercase">Guardian</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <FieldLabel htmlFor="student-guardianName">Guardian&apos;s name</FieldLabel>
                <Input id="student-guardianName" name="guardianName" defaultValue={student?.guardianName} className={CONTROL} {...invalid("guardianName")} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="student-guardianRelation" optional>
                  Relation
                </FieldLabel>
                <Input id="student-guardianRelation" name="guardianRelation" defaultValue={student?.guardianRelation} placeholder="e.g. Father, Mother, Uncle" className={CONTROL} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="student-guardianPhone">Guardian&apos;s mobile</FieldLabel>
                <Input
                  id="student-guardianPhone"
                  name="guardianPhone"
                  type="tel"
                  inputMode="tel"
                  defaultValue={student?.guardianPhone}
                  placeholder="01XXXXXXXXX"
                  className={CONTROL}
                  {...invalid("guardianPhone")}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <FieldLabel htmlFor="student-address" optional>
                  Address
                </FieldLabel>
                <Textarea id="student-address" name="address" rows={2} defaultValue={student?.address} className="rounded-xl bg-card dark:bg-card" />
              </div>
            </div>
          </fieldset>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {student ? "Save changes" : "Add student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddStudentButton({ classes }: { classes: ClassView[] }) {
  const [open, setOpen] = React.useState(false);
  const ready = classes.some((c) => c.sections.length > 0);
  if (!ready) {
    return (
      <Button nativeButton={false} render={<Link href="/dashboard/classes" />} variant="outline" className="h-10 rounded-full px-4 font-bold">
        Set up classes first
      </Button>
    );
  }
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        Add student
      </Button>
      {open && <StudentFormDialog classes={classes} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ---------------------------------------------------------------- list */

type Tab = StudentStatus | "all";
const TABS: { value: Tab; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "left", label: "Left" },
  { value: "graduated", label: "Graduated" },
  { value: "all", label: "All" },
];
const PAGE = 50;

export function StudentsTable({ students, classes }: { students: StudentRow[]; classes: ClassView[] }) {
  const [tab, setTab] = React.useState<Tab>("active");
  const [classId, setClassId] = React.useState("all");
  const [sectionId, setSectionId] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [shown, setShown] = React.useState(PAGE);

  const cls = classes.find((c) => c.id === classId);
  const classItems = [{ value: "all", label: "All classes" }, ...classes.map((c) => ({ value: c.id, label: c.name }))];
  const sectionItems = [{ value: "all", label: "All sections" }, ...(cls?.sections ?? []).map((s) => ({ value: s.id, label: `${s.name} · ${SHIFT_LABELS[s.shift]}` }))];

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const rows = students.filter(
    (s) =>
      (tab === "all" || s.status === tab) &&
      (classId === "all" || s.classId === classId) &&
      (sectionId === "all" || s.sectionId === sectionId) &&
      (!q || s.name.toLowerCase().includes(q) || s.nameBn.includes(query.trim()) || s.studentCode.includes(q) || (digits.length >= 4 && s.guardianPhone.includes(digits)))
  );
  const counts = TABS.reduce((m, t) => ({ ...m, [t.value]: t.value === "all" ? students.length : students.filter((s) => s.status === t.value).length }), {} as Record<Tab, number>);

  if (students.length === 0) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="font-bold">No students yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Add your first student with &quot;Add student&quot;. The guardian&apos;s mobile is used for attendance and fee SMS.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="grid gap-3 border-b border-border p-4">
        <div role="tablist" aria-label="Student status" className="flex w-fit flex-wrap gap-1 rounded-full border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => (setTab(t.value), setShown(PAGE))}
              className={cn(
                "h-9 cursor-pointer rounded-full px-4 text-sm font-bold transition-colors",
                tab === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label} <span className="tabular-nums opacity-80">{counts[t.value]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => (setQuery(e.target.value), setShown(PAGE))}
              placeholder="Search name, student ID or guardian mobile"
              aria-label="Search students"
              className="h-10 rounded-xl bg-card pl-9 dark:bg-card"
            />
          </div>
          <Select
            value={classId}
            onValueChange={(v) => {
              setClassId((v as string) ?? "all");
              setSectionId("all");
              setShown(PAGE);
            }}
            items={classItems}
          >
            <SelectTrigger aria-label="Class" className="h-10 w-[170px] rounded-xl bg-card dark:bg-card">
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
          <Select value={sectionId} onValueChange={(v) => (setSectionId((v as string) ?? "all"), setShown(PAGE))} items={sectionItems} disabled={!cls}>
            <SelectTrigger aria-label="Section" className="h-10 w-[170px] rounded-xl bg-card dark:bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sectionItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <p className="font-bold">No students match</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 font-bold text-muted-foreground">Student</TableHead>
                <TableHead className="font-bold text-muted-foreground">ID</TableHead>
                <TableHead className="font-bold text-muted-foreground">Class</TableHead>
                <TableHead className="text-right font-bold text-muted-foreground">Roll</TableHead>
                <TableHead className="font-bold text-muted-foreground">Guardian</TableHead>
                <TableHead className="pr-5 font-bold text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, shown).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="py-2.5 pl-5">
                    <Link href={`/dashboard/students/${s.id}`} className="flex items-center gap-3 hover:text-primary">
                      <StudentAvatar student={s} className="size-9" />
                      <span className="grid leading-tight">
                        <span className="font-bold">{s.name}</span>
                        {s.nameBn && <span className="text-[12.5px] text-muted-foreground">{s.nameBn}</span>}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">{s.studentCode}</TableCell>
                  <TableCell>
                    {s.className} · {s.sectionName}
                    <span className="block text-[12px] text-muted-foreground">{SHIFT_LABELS[s.shift]} shift</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{s.roll}</TableCell>
                  <TableCell>
                    {s.guardianName}
                    <span className="block text-[12.5px] text-muted-foreground tabular-nums">{prettyPhone(s.guardianPhone)}</span>
                  </TableCell>
                  <TableCell className="pr-5">
                    <StudentStatusBadge status={s.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {rows.length > shown && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
          <span className="text-muted-foreground">
            Showing {shown} of {rows.length}
          </span>
          <Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)} className="rounded-full px-4 font-bold">
            Show more
          </Button>
        </div>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- profile actions */

export function StudentProfileActions({ student, classes }: { student: StudentRow; classes: ClassView[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = React.useTransition();

  const status = (s: StudentStatus) =>
    startTransition(async () => {
      const r = await setStudentStatus(student.id, s);
      setMessage(r.ok ? (r.message ? { ok: true, text: r.message } : undefined) : { ok: false, text: r.error });
      router.refresh();
    });

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setEditing(true)} className="h-10 gap-2 rounded-full px-4 font-bold">
          <Pencil className="size-4" />
          Edit
        </Button>
        {student.status === "active" ? (
          <>
            <Button variant="outline" disabled={pending} onClick={() => status("graduated")} className="h-10 gap-2 rounded-full px-4 font-bold">
              <GraduationCap className="size-4" />
              Mark graduated
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => status("left")} className="h-10 gap-2 rounded-full px-4 font-bold text-destructive hover:text-destructive">
              <LogOut className="size-4" />
              Mark as left
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled={pending} onClick={() => status("active")} className="h-10 gap-2 rounded-full px-4 font-bold">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Make active again
          </Button>
        )}
      </div>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={cn("text-sm font-semibold", message.ok ? "text-primary" : "text-destructive")}>
          {message.text}
        </p>
      )}
      {editing && <StudentFormDialog classes={classes} student={student} onClose={() => setEditing(false)} />}
    </div>
  );
}

export function PhotoUpload({ student, canEdit }: { student: StudentRow; canEdit: boolean }) {
  const router = useRouter();
  const input = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const upload = (file: File) => {
    const form = new FormData();
    form.set("photo", file);
    setError(undefined);
    startTransition(async () => {
      const r = await uploadStudentPhoto(student.id, form);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  };

  return (
    <div className="grid justify-items-center gap-2">
      <StudentAvatar student={student} className="size-28 text-2xl" />
      {canEdit && (
        <>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Choose a photo"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()} className="gap-1.5 rounded-full px-3 font-bold">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            {student.hasPhoto ? "Change photo" : "Add photo"}
          </Button>
          <p className="text-[12px] text-muted-foreground">JPG, PNG or WebP, under 2 MB</p>
          {error && (
            <p role="alert" className="text-center text-[12.5px] font-semibold text-destructive">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

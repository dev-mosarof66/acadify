"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, MoreHorizontal, Pencil, Plus, School, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError, SHIFT_LABELS } from "@/components/dashboard/form-bits";
import { deleteClass, deleteSection, moveClass, saveClass, saveSection, type ActionResult } from "@/lib/institute/actions";
import type { ClassView, SectionView, Shift } from "@/lib/institute/queries";
import { cn } from "@/lib/utils";

const SHIFT_ITEMS = (Object.keys(SHIFT_LABELS) as Shift[]).map((s) => ({ value: s, label: SHIFT_LABELS[s] }));

/** Runs an action, then refreshes the page or reports the error. */
function useRun(onError: (m: string) => void) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const run = (fn: () => Promise<ActionResult>, onDone?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return onError(r.error);
      onDone?.();
      router.refresh();
    });
  return [pending, run] as const;
}

function ClassDialog({ cls, onClose }: { cls?: ClassView; onClose: () => void }) {
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (cls) form.set("id", cls.id);
    startTransition(async () => {
      const r = await saveClass(form);
      if (!r.ok) return setError({ message: r.error, field: r.field });
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cls ? `Rename ${cls.name}` : "New class"}</DialogTitle>
          <DialogDescription>{cls ? "Students stay in it." : "It starts with section A (day shift); add more sections after."}</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError>{error?.message}</FormError>
          <div className="grid gap-2">
            <FieldLabel htmlFor="class-name">Name</FieldLabel>
            <Input id="class-name" name="name" autoFocus defaultValue={cls?.name} placeholder="e.g. Class 6, Dakhil 9th, Hifz" className={CONTROL} aria-invalid={error?.field === "name" || undefined} />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="class-nameBn" optional>
              Name in Bangla
            </FieldLabel>
            <Input id="class-nameBn" name="nameBn" lang="bn" defaultValue={cls?.nameBn} placeholder="যেমন ষষ্ঠ শ্রেণি" className={CONTROL} />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {cls ? "Save" : "Add class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionDialog({ cls, section, onClose }: { cls: ClassView; section?: SectionView; onClose: () => void }) {
  const [shift, setShift] = React.useState<Shift>(section?.shift ?? "day");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("classId", cls.id);
    form.set("shift", shift);
    if (section) form.set("id", section.id);
    startTransition(async () => {
      const r = await saveSection(form);
      if (!r.ok) return setError({ message: r.error, field: r.field });
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{section ? `Edit section ${section.name}` : `New section in ${cls.name}`}</DialogTitle>
          <DialogDescription>Sections split a class into groups with their own rolls.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError>{error?.message}</FormError>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="section-name">Section</FieldLabel>
              <Input id="section-name" name="name" autoFocus defaultValue={section?.name} placeholder="e.g. A, B, Boys" className={CONTROL} aria-invalid={error?.field === "name" || undefined} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="section-shift">Shift</FieldLabel>
              <Select value={shift} onValueChange={(v) => v && setShift(v as Shift)} items={SHIFT_ITEMS}>
                <SelectTrigger id="section-shift" className={`${CONTROL} w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_ITEMS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="section-capacity" optional>
              Seats
            </FieldLabel>
            <Input
              id="section-capacity"
              name="capacity"
              inputMode="numeric"
              defaultValue={section?.capacity ?? ""}
              placeholder="Empty = no limit"
              className={CONTROL}
              aria-invalid={error?.field === "capacity" || undefined}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {section ? "Save" : "Add section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClassCard({
  cls,
  first,
  last,
  onEdit,
  onAddSection,
  onEditSection,
  onError,
}: {
  cls: ClassView;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onAddSection: () => void;
  onEditSection: (s: SectionView) => void;
  onError: (m: string) => void;
}) {
  const [pending, run] = useRun(onError);

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-extrabold tracking-tight">
            {cls.name}
            {cls.nameBn && <span className="ml-2 text-sm font-semibold text-muted-foreground">{cls.nameBn}</span>}
          </h2>
          <p className="text-[13px] text-muted-foreground">
            {cls.students.toLocaleString("en-IN")} {cls.students === 1 ? "student" : "students"} · {cls.sections.length} {cls.sections.length === 1 ? "section" : "sections"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onAddSection} className="gap-1.5 rounded-full px-3 font-bold">
            <Plus className="size-3.5" />
            Section
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" disabled={pending} aria-label={`More for ${cls.name}`} className="size-8 rounded-lg" />}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem disabled={first} onClick={() => run(() => moveClass(cls.id, -1))}>
                <ArrowUp className="size-4" />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem disabled={last} onClick={() => run(() => moveClass(cls.id, 1))}>
                <ArrowDown className="size-4" />
                Move down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" disabled={cls.students > 0} onClick={() => run(() => deleteClass(cls.id))}>
                <Trash2 className="size-4" />
                {cls.students > 0 ? "Delete (has students)" : "Delete class"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {cls.sections.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">No sections yet. Add one to start adding students.</p>
      ) : (
        <ul className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {cls.sections.map((s) => {
            const full = s.capacity !== null && s.students >= s.capacity;
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-light text-sm font-extrabold text-primary">{s.name.slice(0, 3)}</span>
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm font-bold">
                    Section {s.name} · {SHIFT_LABELS[s.shift]}
                  </span>
                  <span className={cn("flex items-center gap-1 text-[12.5px]", full ? "font-semibold text-destructive" : "text-muted-foreground")}>
                    <Users className="size-3.5" />
                    {s.students}
                    {s.capacity !== null ? ` / ${s.capacity} seats` : " students"}
                  </span>
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`More for section ${s.name}`} className="size-8 rounded-lg" />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onEditSection(s)}>
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" disabled={s.students > 0} onClick={() => run(() => deleteSection(s.id))}>
                      <Trash2 className="size-4" />
                      {s.students > 0 ? "Delete (has students)" : "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function NewClassButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        New class
      </Button>
      {open && <ClassDialog onClose={() => setOpen(false)} />}
    </>
  );
}

export function ClassesBoard({ classes }: { classes: ClassView[] }) {
  const [editing, setEditing] = React.useState<ClassView | null>(null);
  const [section, setSection] = React.useState<{ cls: ClassView; section?: SectionView } | null>(null);
  const [error, setError] = React.useState<string>();

  if (classes.length === 0) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <School className="size-8 text-muted-foreground" />
          <p className="font-bold">No classes yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Add each class your institute teaches, from the youngest up. You can rename and reorder them any time.</p>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <FormError>{error}</FormError>
      <div className="grid gap-4">
        {classes.map((c, i) => (
          <ClassCard
            key={c.id}
            cls={c}
            first={i === 0}
            last={i === classes.length - 1}
            onEdit={() => setEditing(c)}
            onAddSection={() => setSection({ cls: c })}
            onEditSection={(s) => setSection({ cls: c, section: s })}
            onError={setError}
          />
        ))}
      </div>
      {editing && <ClassDialog cls={editing} onClose={() => setEditing(null)} />}
      {section && <SectionDialog cls={section.cls} section={section.section} onClose={() => setSection(null)} />}
    </>
  );
}

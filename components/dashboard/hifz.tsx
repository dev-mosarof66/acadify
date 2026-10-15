"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpenText, Check, Loader2, Pencil } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import { saveHifzLog, setParaMemorized } from "@/lib/hifz/actions";
import type { HifzLog, HifzRating } from "@/lib/hifz/queries";
import { formatDate } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

export const RATING_LABELS: Record<HifzRating, string> = {
  mumtaz: "Mumtaz",
  jayyid_jiddan: "Jayyid Jiddan",
  jayyid: "Jayyid",
  maqbul: "Maqbul",
  needs_work: "Needs work",
};
const RATING_TONE: Record<HifzRating, string> = {
  mumtaz: "bg-primary-light text-primary",
  jayyid_jiddan: "bg-primary-light text-primary",
  jayyid: "bg-secondary text-foreground",
  maqbul: "bg-warning-light text-accent-foreground dark:text-warning",
  needs_work: "bg-danger-light text-destructive",
};
const RATING_ITEMS = (Object.keys(RATING_LABELS) as HifzRating[]).map((r) => ({ value: r, label: RATING_LABELS[r] }));

export function RatingBadge({ rating }: { rating: HifzRating }) {
  return <Badge className={cn("h-6 rounded-full px-2.5 text-[11.5px] font-bold", RATING_TONE[rating])}>{RATING_LABELS[rating]}</Badge>;
}

type Row = { id: string; name: string; roll: number; hasPhoto: boolean; log: HifzLog | null; paras: number };

function LogDialog({ student, date, onClose }: { student: Row; date: string; onClose: () => void }) {
  const router = useRouter();
  const [rating, setRating] = React.useState<HifzRating | "">(student.log?.rating ?? "");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("rating", rating);
    startTransition(async () => {
      const r = await saveHifzLog(student.id, date, form);
      if (!r.ok) return setError({ message: r.error, field: r.field });
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {student.name} · Roll {student.roll}
          </DialogTitle>
          <DialogDescription>Today&apos;s lesson. Fill in what applies.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError>{error?.message}</FormError>
          <div className="grid gap-4 sm:grid-cols-[1fr_96px]">
            <div className="grid gap-2">
              <FieldLabel htmlFor="hifz-sabak" optional>
                Sabak (new lesson)
              </FieldLabel>
              <Input id="hifz-sabak" name="sabak" autoFocus defaultValue={student.log?.sabak} placeholder="e.g. Al-Baqarah 1–10" className={CONTROL} aria-invalid={error?.field === "sabak" || undefined} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="hifz-para" optional>
                Para
              </FieldLabel>
              <Input id="hifz-para" name="sabakPara" inputMode="numeric" defaultValue={student.log?.sabakPara ?? ""} placeholder="1–30" className={CONTROL} aria-invalid={error?.field === "sabakPara" || undefined} />
            </div>
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="hifz-sabki" optional>
              Sabki (recent revision)
            </FieldLabel>
            <Input id="hifz-sabki" name="sabki" defaultValue={student.log?.sabki} placeholder="e.g. Para 4, half" className={CONTROL} />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="hifz-dour" optional>
              Dour (older revision)
            </FieldLabel>
            <Input id="hifz-dour" name="dour" defaultValue={student.log?.dour} placeholder="e.g. Para 1–2" className={CONTROL} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="hifz-rating" optional>
                How it went
              </FieldLabel>
              <Select value={rating || null} onValueChange={(v) => setRating((v as HifzRating) ?? "")} items={RATING_ITEMS}>
                <SelectTrigger id="hifz-rating" className={`${CONTROL} w-full`}>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {RATING_ITEMS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="hifz-note" optional>
                Note
              </FieldLabel>
              <Input id="hifz-note" name="note" defaultValue={student.log?.note} className={CONTROL} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save lesson
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function HifzSection({ students, date, canWrite }: { students: Row[]; date: string; canWrite: boolean }) {
  const [editing, setEditing] = React.useState<Row | null>(null);
  if (!students.length) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <BookOpenText className="size-8 text-muted-foreground" />
          <p className="font-bold">No active students in this section</p>
        </div>
      </Panel>
    );
  }
  return (
    <>
      <Panel>
        <ul className="divide-y divide-border">
          {students.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="w-7 text-center text-sm font-extrabold tabular-nums">{s.roll}</span>
              <Avatar className="size-10">
                {s.hasPhoto && <AvatarImage src={`/api/students/${s.id}/photo`} alt="" className="object-cover" />}
                <AvatarFallback className="bg-primary-light text-xs font-bold text-primary">{s.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-[180px] flex-1">
                <Link href={`/dashboard/hifz/student/${s.id}`} className="font-bold hover:text-primary">
                  {s.name}
                </Link>
                <p className="text-[13px] text-muted-foreground">
                  {s.log ? [s.log.sabak && `Sabak: ${s.log.sabak}`, s.log.sabki && `Sabki: ${s.log.sabki}`, s.log.dour && `Dour: ${s.log.dour}`].filter(Boolean).join(" · ") : "No lesson recorded"}
                </p>
              </div>
              <span className="text-[13px] font-semibold text-muted-foreground tabular-nums">{s.paras}/30 paras</span>
              {s.log?.rating && <RatingBadge rating={s.log.rating} />}
              {canWrite && (
                <Button size="sm" variant={s.log ? "outline" : "default"} onClick={() => setEditing(s)} className="gap-1.5 rounded-full px-3 font-bold">
                  {s.log ? <Pencil className="size-3.5" /> : <Check className="size-3.5" />}
                  {s.log ? "Edit" : "Record"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      {editing && <LogDialog key={editing.id} student={editing} date={date} onClose={() => setEditing(null)} />}
    </>
  );
}

/** The 30-para map: tap a para to mark it memorized (or not). */
export function ParaMap({ studentId, paras, canWrite }: { studentId: string; paras: Record<number, string>; canWrite: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string>();
  const done = Object.keys(paras).length;

  const toggle = async (p: number) => {
    setBusy(p);
    const r = await setParaMemorized(studentId, p, !paras[p]);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    router.refresh();
  };

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="font-extrabold">{done} of 30 paras memorized</p>
          <p className="text-[13px] text-muted-foreground">{canWrite ? "Tap a para to mark it done, or tap again to undo." : "Green paras are memorized."}</p>
        </div>
        <div className="h-2.5 w-48 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${(done / 30) * 100}%` }} />
        </div>
      </div>
      {error && <p role="alert" className="border-b border-border bg-danger-light px-5 py-3 text-sm font-semibold text-destructive">{error}</p>}
      <ol className="grid grid-cols-5 gap-2 p-5 sm:grid-cols-6 lg:grid-cols-10">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((p) => {
          const on = Boolean(paras[p]);
          return (
            <li key={p}>
              <button
                type="button"
                disabled={!canWrite || busy !== null}
                onClick={() => toggle(p)}
                aria-pressed={on}
                aria-label={`Para ${p}${on ? `, memorized on ${formatDate(paras[p])}` : ""}`}
                title={on ? `Memorized ${formatDate(paras[p])}` : `Para ${p}`}
                className={cn(
                  "grid aspect-square w-full place-items-center rounded-xl border-2 text-sm font-extrabold tabular-nums transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
                  canWrite && "cursor-pointer hover:border-primary"
                )}
              >
                {busy === p ? <Loader2 className="size-4 animate-spin" /> : p}
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

export function HifzHistory({ logs }: { logs: HifzLog[] }) {
  if (!logs.length) return <p className="px-5 py-10 text-center text-sm text-muted-foreground">No lessons recorded yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {logs.map((l) => (
        <li key={l.date} className="grid gap-1 px-5 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{formatDate(l.date)}</span>
            {l.rating && <RatingBadge rating={l.rating} />}
            <span className="ml-auto text-[12.5px] text-muted-foreground">{l.teacherName}</span>
          </div>
          <p className="text-muted-foreground">
            {[l.sabak && `Sabak: ${l.sabak}${l.sabakPara ? ` (para ${l.sabakPara})` : ""}`, l.sabki && `Sabki: ${l.sabki}`, l.dour && `Dour: ${l.dour}`].filter(Boolean).join(" · ")}
          </p>
          {l.note && <p className="text-[13px]">{l.note}</p>}
        </li>
      ))}
    </ul>
  );
}

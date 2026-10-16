"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { editKbChapter } from "@/lib/kb/actions";
import type { ChapterPlanView, JobView } from "@/lib/kb/jobs";

/**
 * Fix a chapter the contents page got wrong: its name and the PDF pages it covers.
 * Renaming a parsed chapter rewrites its files for free; new pages mean it has to be parsed again.
 */
export function EditChapterDialog({ job, chapter, onSaved, onClose }: { job: JobView; chapter: ChapterPlanView; onSaved: (job: JobView) => void; onClose: () => void }) {
  const [title, setTitle] = React.useState(chapter.title);
  const [from, setFrom] = React.useState(String(chapter.pageFrom));
  const [to, setTo] = React.useState(String(chapter.pageTo));
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const offset = job.meta.printedPageOffset;
  const pagesChanged = Number(from) !== chapter.pageFrom || Number(to) !== chapter.pageTo;
  const overlaps = job.chapters.filter((c) => c.number !== chapter.number && Number(from) <= c.pageTo && Number(to) >= c.pageFrom);
  const reparse = pagesChanged && (chapter.status === "done" || chapter.status === "failed");
  const book = (n: number) => (Number.isFinite(n) ? n - offset : "?");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const r = await editKbChapter(job.id, chapter.number, { title, pageFrom: Number(from), pageTo: Number(to) });
      if (r.error) return setError(r.error);
      if (r.job) onSaved(r.job);
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit chapter {chapter.number}</DialogTitle>
          <DialogDescription>Correct the name or the pages if the contents page was read wrong. Pages are PDF pages (1 to {job.pageCount}).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormError>{error}</FormError>
          <div className="grid gap-2">
            <FieldLabel htmlFor="kb-edit-title">Chapter name</FieldLabel>
            <Input id="kb-edit-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className={CONTROL} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="kb-edit-from">First page</FieldLabel>
              <Input id="kb-edit-from" value={from} onChange={(e) => setFrom(e.target.value)} inputMode="numeric" className={CONTROL} />
              <p className="text-[12px] text-muted-foreground">Book page {book(Number(from))}</p>
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="kb-edit-to">Last page</FieldLabel>
              <Input id="kb-edit-to" value={to} onChange={(e) => setTo(e.target.value)} inputMode="numeric" className={CONTROL} />
              <p className="text-[12px] text-muted-foreground">Book page {book(Number(to))}</p>
            </div>
          </div>
          {overlaps.length > 0 && (
            <p className="rounded-xl bg-muted px-4 py-3 text-[13px] text-muted-foreground">
              These pages overlap chapter {overlaps.map((c) => c.number).join(", ")}. That is allowed, but check the other chapter&apos;s pages too.
            </p>
          )}
          {reparse && <p className="rounded-xl bg-muted px-4 py-3 text-[13px] text-muted-foreground">Changing the pages means this chapter has to be parsed again, which uses credits. Its current files stay until then.</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-xl" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="rounded-xl">
              {pending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, MessageCircleQuestion, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import { deleteFaq, moveFaq, saveFaq, setFaqPublic, type FaqResult } from "@/lib/faqs/actions";
import type { Faq } from "@/lib/faqs/queries";
import { cn } from "@/lib/utils";

const AREA = "rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";

function FaqDialog({ faq, onClose }: { faq?: Faq; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (faq) form.set("id", faq.id);
    startTransition(async () => {
      const r = await saveFaq(form);
      if (!r.ok) {
        setError({ message: r.error, field: r.field });
        if (r.field) document.getElementById(`faq-${r.field}`)?.focus();
        return;
      }
      onClose();
      router.refresh();
    });
  };

  const invalid = (f: string) => (error?.field === f ? { "aria-invalid": true as const } : {});

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{faq ? "Edit question" : "New question"}</DialogTitle>
          <DialogDescription>Shown on the homepage as soon as you save. Bangla visitors see the Bangla version when it&apos;s filled in.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError>{error?.message}</FormError>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="faq-question">Question</FieldLabel>
              <Input id="faq-question" name="question" autoFocus defaultValue={faq?.question} placeholder="e.g. Can SMS be sent in Bangla?" className={CONTROL} {...invalid("question")} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="faq-questionBn" optional>
                Question in Bangla
              </FieldLabel>
              <Input id="faq-questionBn" name="questionBn" lang="bn" defaultValue={faq?.questionBn} className={CONTROL} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="faq-answer">Answer</FieldLabel>
              <Textarea id="faq-answer" name="answer" rows={6} defaultValue={faq?.answer} className={AREA} {...invalid("answer")} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="faq-answerBn" optional>
                Answer in Bangla
              </FieldLabel>
              <Textarea id="faq-answerBn" name="answerBn" lang="bn" rows={6} defaultValue={faq?.answerBn} className={AREA} {...invalid("answerBn")} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {faq ? "Save" : "Add question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewFaqButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        New question
      </Button>
      {open && <FaqDialog onClose={() => setOpen(false)} />}
    </>
  );
}

export function FaqsBoard({ faqs }: { faqs: Faq[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Faq | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const run = (id: string, fn: () => Promise<FaqResult>) => {
    setBusy(id);
    startTransition(async () => {
      await fn();
      setBusy(null);
      setConfirmDelete(null);
      router.refresh();
    });
  };

  if (!faqs.length) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <MessageCircleQuestion className="size-8 text-muted-foreground" />
          <p className="font-bold">No questions yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">The FAQ section is hidden on the homepage until you add one.</p>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <ol className="grid gap-3">
        {faqs.map((f, i) => (
          <li key={f.id}>
            <Panel className={cn(!f.isPublic && "opacity-70")}>
              <div className="flex items-start gap-4 p-5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-extrabold text-primary tabular-nums">{i + 1}</span>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{f.question}</h2>
                    {!f.isPublic && <Badge variant="secondary" className="rounded-full px-2 font-bold">Hidden</Badge>}
                    {!f.questionBn && <Badge variant="secondary" className="rounded-full px-2 font-bold text-muted-foreground">No Bangla yet</Badge>}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{f.answer}</p>
                  {f.questionBn && (
                    <p lang="bn" className="line-clamp-1 text-[13px] text-muted-foreground">
                      {f.questionBn}
                    </p>
                  )}
                </div>
                {confirmDelete === f.id ? (
                  <span className="inline-flex shrink-0 gap-1">
                    <Button size="sm" variant="destructive" disabled={busy === f.id} onClick={() => run(f.id, () => deleteFaq(f.id))} className="rounded-full">
                      Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)} className="rounded-full">
                      Keep
                    </Button>
                  </span>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`More for "${f.question}"`} className="size-8 shrink-0 rounded-lg" />}>
                      {busy === f.id ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => setEditing(f)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => run(f.id, () => setFaqPublic(f.id, !f.isPublic))}>
                        {f.isPublic ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        {f.isPublic ? "Hide from website" : "Show on website"}
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={i === 0} onClick={() => run(f.id, () => moveFaq(f.id, -1))}>
                        <ArrowUp className="size-4" />
                        Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={i === faqs.length - 1} onClick={() => run(f.id, () => moveFaq(f.id, 1))}>
                        <ArrowDown className="size-4" />
                        Move down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(f.id)}>
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </Panel>
          </li>
        ))}
      </ol>
      {editing && <FaqDialog key={editing.id} faq={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

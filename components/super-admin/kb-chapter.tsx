"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Pencil, RotateCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MathBlock, MathText, renderMathInHtml } from "@/components/super-admin/math-text";
import { curateKbPassage, readChapter } from "@/lib/kb/actions";
import type { AiReport } from "@/lib/kb/aiready";
import type { ChapterView, ChapterViewPassage } from "@/lib/kb/export";
import { sanitizeTableHtml } from "@/lib/kb/html";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  definition: "Definition",
  formula: "Formula",
  example: "Example",
  exercise: "Exercise",
  activity: "Activity",
  table: "Table",
  objective: "Learning outcome",
  figure: "Figure",
};

const REASON_LABEL: Record<string, string> = {
  "latin-junk": "stray Latin letters",
  "foreign-script": "letters from another script",
  "known-confusable-corrected": "word auto-corrected",
  "verify-formula": "check formula",
  "verify-table": "check table",
};

function PassageBody({ p, dir, number }: { p: ChapterViewPassage; dir: string; number: number }) {
  if (p.kind === "table") {
    return (
      <div
        className="overflow-x-auto text-[13px] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left"
        dangerouslySetInnerHTML={{ __html: renderMathInHtml(sanitizeTableHtml(p.body)) }}
      />
    );
  }
  if (p.kind === "formula") return <MathBlock tex={p.body} />;
  const text = p.body.replace(/\*\*/g, "");
  if (p.kind === "figure") {
    const src = p.image ? `/api/admin/kb/asset?${new URLSearchParams({ dir, chapter: String(number), file: p.image })}` : null;
    return (
      <figure className="grid gap-1.5">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={text} loading="lazy" className="max-h-80 w-auto max-w-full rounded-lg border border-border bg-white object-contain p-1" />
        )}
        <MathText text={text} className="text-[13px] italic text-muted-foreground" />
      </figure>
    );
  }
  return <MathText text={text} className="whitespace-pre-wrap text-[14px] leading-7" />;
}

const AI_LABEL = { included: "In AI set", held: "Held for review", excluded: "Left out", exercise: "Exercise (kept apart)" } as const;

/** One passage with its AI status and the reviewer's buttons: keep, leave out, edit, reset. */
function PassageView({ p, dir, number, onChange }: { p: ChapterViewPassage; dir: string; number: number; onChange: (p: ChapterViewPassage, ai: AiReport) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(p.body);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const act = (action: Parameters<typeof curateKbPassage>[3], after?: () => void) =>
    startTransition(async () => {
      setError(undefined);
      const r = await curateKbPassage(dir, number, p.id, action).catch(() => ({ error: "Couldn't save that. Try again." }));
      if ("error" in r) return setError(r.error);
      onChange(r.passage, r.ai);
      after?.();
    });

  const state = p.ai.state;
  const out = state === "excluded";
  return (
    <div className={cn("grid gap-1.5", out && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
        <span>p. {p.printedPageStart}</span>
        {KIND_LABEL[p.kind] && <Badge variant="secondary">{KIND_LABEL[p.kind]}</Badge>}
        <Badge variant={state === "held" ? "destructive" : state === "included" ? "outline" : "secondary"} title={p.ai.reason}>
          {AI_LABEL[state]}
        </Badge>
        {p.edited && <Badge variant="outline">edited</Badge>}
        {state !== "included" && <span className="italic">{p.ai.reason}</span>}
        {p.reviewReasons.map((r) => (
          <Badge key={r} variant="outline">
            {REASON_LABEL[r] ?? r}
          </Badge>
        ))}
        <span className="ml-auto flex items-center gap-1">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {(state === "held" || state === "excluded") && (
            <Button size="xs" variant="ghost" disabled={pending} onClick={() => act({ type: "keep" })} className="rounded-md">
              <Check />
              Keep
            </Button>
          )}
          {state !== "excluded" && (
            <Button size="xs" variant="ghost" disabled={pending} onClick={() => act({ type: "exclude" })} className="rounded-md">
              <X />
              Leave out
            </Button>
          )}
          {p.kind !== "figure" && p.kind !== "table" && (
            <Button
              size="xs"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setDraft(p.body);
                setEditing(true);
              }}
              className="rounded-md"
            >
              <Pencil />
              Edit
            </Button>
          )}
          {p.reviewed && (
            <Button size="xs" variant="ghost" disabled={pending} onClick={() => act({ type: "reset" })} className="rounded-md">
              <RotateCcw />
              Reset
            </Button>
          )}
        </span>
      </div>
      {error && <p className="text-[12px] font-semibold text-destructive">{error}</p>}
      {p.caption && <p className="text-[13px] font-bold">{p.caption}</p>}
      {editing ? (
        <div className="grid gap-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={Math.min(14, Math.max(4, draft.split("\n").length + 2))} className="rounded-xl text-[14px] leading-7" />
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => act({ type: "edit", body: draft }, () => setEditing(false))} className="rounded-lg">
              Save
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(false)} className="rounded-lg">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <PassageBody p={p} dir={dir} number={number} />
      )}
    </div>
  );
}

function AiSummary({ ai, heldOnly, onToggle }: { ai: AiReport; heldOnly: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-muted px-4 py-3 text-[13px]">
      <span className="font-bold">AI-ready</span>
      <span>{ai.included} in the AI set</span>
      <span className={cn(ai.held > 0 && "font-bold text-destructive")}>{ai.held} held for review</span>
      <span>{ai.excluded} left out</span>
      <span>{ai.exercises} exercises kept apart</span>
      <label className="ml-auto flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={heldOnly} onChange={onToggle} />
        Only show held
      </label>
    </div>
  );
}

function ChapterContent({ chapter, dir, onChange }: { chapter: ChapterView; dir: string; onChange: (p: ChapterViewPassage, ai: AiReport) => void }) {
  const [heldOnly, setHeldOnly] = React.useState(false);
  return (
    <div className="grid gap-6">
      <AiSummary ai={chapter.ai} heldOnly={heldOnly} onToggle={() => setHeldOnly((v) => !v)} />
      {chapter.topics.map((t) => {
        let section: string | null = null;
        const shown = t.passages.filter((p) => !heldOnly || p.ai.state === "held");
        if (!shown.length) return null;
        return (
          <section key={t.key} className="grid gap-3">
            <h3 className="text-[15px] font-extrabold">
              {t.key} · {t.title}
            </h3>
            {shown.map((p) => {
              const heading = p.section && p.section !== section ? p.section : null;
              if (p.section) section = p.section;
              return (
                <div key={p.id} className="grid gap-1.5">
                  {heading && <h4 className="mt-2 text-[14px] font-bold text-primary">{heading}</h4>}
                  <PassageView p={p} dir={dir} number={chapter.number} onChange={onChange} />
                </div>
              );
            })}
          </section>
        );
      })}
      {heldOnly && chapter.ai.held === 0 && <p className="text-sm text-muted-foreground">Nothing is held for review.</p>}
    </div>
  );
}

/**
 * A chapter row. When the chapter has been written to kb/ (`dir` set) it opens to show the extracted
 * content, read from the files the first time it is opened; `trailing` holds the row's buttons.
 */
export function ChapterRow({ dir, number, title, summary, trailing }: { dir: string | null; number: number; title: string; summary: React.ReactNode; trailing?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [chapter, setChapter] = React.useState<ChapterView | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const toggle = () => {
    if (!dir) return;
    const next = !open;
    setOpen(next);
    if (next && !chapter) {
      startTransition(async () => {
        const data = await readChapter(dir, number).catch(() => null);
        if (data) setChapter(data);
        else setFailed(true);
      });
    }
  };

  // A reviewer's change comes back as the updated passage plus the chapter's new AI totals
  const onPassage = (passage: ChapterViewPassage, ai: AiReport) =>
    setChapter((c) => (c ? { ...c, ai, topics: c.topics.map((t) => ({ ...t, passages: t.passages.map((p) => (p.id === passage.id ? passage : p)) })) } : c));

  const label = (
    <>
      {dir && <ChevronDown className={cn("size-4 shrink-0 transition-transform", !open && "-rotate-90")} />}
      <span className="font-bold">
        {number}. {title}
      </span>
      <span className="text-muted-foreground">{summary}</span>
      {pending && <Loader2 className="size-4 animate-spin" />}
    </>
  );

  return (
    <li className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {dir ? (
          <button type="button" onClick={toggle} aria-expanded={open} className="flex min-w-0 flex-wrap items-center gap-x-3 text-left">
            {label}
          </button>
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3">{label}</div>
        )}
        {trailing && <div className="flex flex-wrap items-center gap-2">{trailing}</div>}
      </div>
      {open && dir && (
        <div className="max-h-[70vh] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-4">
          {chapter ? <ChapterContent chapter={chapter} dir={dir} onChange={onPassage} /> : failed ? <p className="text-sm text-destructive">Couldn&apos;t read this chapter&apos;s files.</p> : <p className="text-sm text-muted-foreground">Loading…</p>}
        </div>
      )}
    </li>
  );
}

"use client";

import * as React from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MathBlock, MathText, renderMathInHtml } from "@/components/super-admin/math-text";
import { readChapter } from "@/lib/kb/actions";
import type { ChapterView } from "@/lib/kb/export";
import { sanitizeTableHtml } from "@/lib/kb/html";
import { cn } from "@/lib/utils";

type Passage = ChapterView["topics"][number]["passages"][number];

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
  "known-confusable-corrected": "word auto-corrected",
  "verify-formula": "check formula",
  "verify-table": "check table",
};

function PassageBody({ p, dir, number }: { p: Passage; dir: string; number: number }) {
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

function ChapterContent({ chapter, dir }: { chapter: ChapterView; dir: string }) {
  return (
    <div className="grid gap-6">
      {chapter.topics.map((t) => {
        let section: string | null = null;
        return (
          <section key={t.key} className="grid gap-3">
            <h3 className="text-[15px] font-extrabold">
              {t.key} · {t.title}
            </h3>
            {t.passages.map((p) => {
              const heading = p.section && p.section !== section ? p.section : null;
              if (p.section) section = p.section;
              return (
                <div key={p.id} className="grid gap-1.5">
                  {heading && <h4 className="mt-2 text-[14px] font-bold text-primary">{heading}</h4>}
                  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                    <span>p. {p.printedPageStart}</span>
                    {KIND_LABEL[p.kind] && <Badge variant="secondary">{KIND_LABEL[p.kind]}</Badge>}
                    {p.reviewReasons.map((r) => (
                      <Badge key={r} variant="outline">
                        {REASON_LABEL[r] ?? r}
                      </Badge>
                    ))}
                  </div>
                  {p.caption && <p className="text-[13px] font-bold">{p.caption}</p>}
                  <PassageBody p={p} dir={dir} number={chapter.number} />
                </div>
              );
            })}
          </section>
        );
      })}
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
        <div className="rounded-xl border border-border bg-card p-4">
          {chapter ? <ChapterContent chapter={chapter} dir={dir} /> : failed ? <p className="text-sm text-destructive">Couldn&apos;t read this chapter&apos;s files.</p> : <p className="text-sm text-muted-foreground">Loading…</p>}
        </div>
      )}
    </li>
  );
}

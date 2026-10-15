"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseCsv, toCsv } from "@/lib/csv";
import { IMPORT_MAX_ROWS, type ImportCommit, type ImportPreview, type ImportRow } from "@/lib/import-types";
import { cn } from "@/lib/utils";

export interface CsvColumn {
  /** Key sent to the server. */
  key: string;
  /** Header written in the template. */
  header: string;
  required: boolean;
  /** What to put in it. */
  hint: string;
  /** Other header spellings people might use. */
  aliases?: string[];
}

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9ঀ-৿]/g, "");

type Stage =
  | { name: "choose"; error?: string }
  | { name: "checking"; file: string }
  | { name: "review"; file: string; rows: ImportRow[]; preview: Extract<ImportPreview, { ok: true }> }
  | { name: "importing" }
  | { name: "done"; result: Extract<ImportCommit, { ok: true }> };

/**
 * Pick a CSV, see which rows are good and which have problems, then import the good ones.
 * `preview` and `commit` run the same checks on the server.
 */
export function CsvImportDialog({
  noun,
  columns,
  templateName,
  preview,
  commit,
  onClose,
}: {
  /** "students", "subjects" */
  noun: string;
  columns: CsvColumn[];
  templateName: string;
  preview: (rows: ImportRow[]) => Promise<ImportPreview>;
  commit: (rows: ImportRow[]) => Promise<ImportCommit>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [stage, setStage] = React.useState<Stage>({ name: "choose" });
  const fileInput = React.useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([toCsv([columns.map((c) => c.header)])], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${templateName}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setStage({ name: "choose", error: "This file is over 5 MB. Split it into smaller files." });
    setStage({ name: "checking", file: file.name });
    const table = parseCsv(await file.text());
    if (table.length < 2) return setStage({ name: "choose", error: `The file has no ${noun}. Fill in the template and try again.` });

    // Match header cells to our columns, ignoring case, spaces and underscores
    const lookup = new Map<string, string>();
    for (const c of columns) for (const name of [c.header, c.key, ...(c.aliases ?? [])]) lookup.set(norm(name), c.key);
    const keys = table[0].map((h) => lookup.get(norm(h)));
    const missing = columns.filter((c) => c.required && !keys.includes(c.key));
    if (missing.length) return setStage({ name: "choose", error: `The file is missing the column${missing.length > 1 ? "s" : ""}: ${missing.map((c) => c.header).join(", ")}.` });
    if (table.length - 1 > IMPORT_MAX_ROWS) return setStage({ name: "choose", error: `A file can hold up to ${IMPORT_MAX_ROWS} rows. Split it and import in parts.` });

    const rows = table.slice(1).map((cells) => {
      const row: ImportRow = {};
      keys.forEach((k, i) => k && (row[k] = (cells[i] ?? "").trim()));
      return row;
    });
    try {
      const result = await preview(rows);
      if (!result.ok) return setStage({ name: "choose", error: result.error });
      setStage({ name: "review", file: file.name, rows, preview: result });
    } catch {
      setStage({ name: "choose", error: "Couldn't check the file. Try again." });
    }
  };

  const run = async (rows: ImportRow[]) => {
    setStage({ name: "importing" });
    try {
      const result = await commit(rows);
      if (!result.ok) return setStage({ name: "choose", error: result.error });
      setStage({ name: "done", result });
      router.refresh();
    } catch {
      setStage({ name: "choose", error: "The import didn't finish. Check the list and try again." });
    }
  };

  const busy = stage.name === "checking" || stage.name === "importing";

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {noun} from CSV</DialogTitle>
          <DialogDescription>Rows with problems are skipped; you see them before anything is saved.</DialogDescription>
        </DialogHeader>

        {stage.name === "choose" && (
          <div className="grid gap-4">
            {stage.error && (
              <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
                {stage.error}
              </p>
            )}
            <div className="rounded-xl border border-border">
              <p className="border-b border-border px-4 py-2.5 text-[12.5px] font-extrabold tracking-wide text-muted-foreground uppercase">Columns</p>
              <ul className="divide-y divide-border text-sm">
                {columns.map((c) => (
                  <li key={c.key} className="grid gap-0.5 px-4 py-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-3">
                    <span className="font-bold">
                      {c.header}
                      {c.required ? <span aria-hidden="true" className="text-destructive"> *</span> : <span className="font-medium text-muted-foreground"> (optional)</span>}
                    </span>
                    <span className="text-muted-foreground">{c.hint}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadTemplate} className="h-11 gap-2 rounded-full px-5 font-bold">
                <Download className="size-4" />
                Download template
              </Button>
              <Button onClick={() => fileInput.current?.click()} className="h-11 gap-2 rounded-full px-5 font-bold">
                <Upload className="size-4" />
                Choose CSV file
              </Button>
              <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" aria-label="CSV file" onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
            </div>
            <p className="text-[12.5px] text-muted-foreground">Save from Excel or Google Sheets as &quot;CSV (UTF-8)&quot; so Bangla names stay readable. Up to {IMPORT_MAX_ROWS} rows per file.</p>
          </div>
        )}

        {(stage.name === "checking" || stage.name === "importing") && (
          <div className="grid justify-items-center gap-3 py-12 text-center" role="status">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="font-bold">{stage.name === "checking" ? `Checking ${stage.file}…` : `Importing ${noun}…`}</p>
            <p className="text-sm text-muted-foreground">Please keep this window open.</p>
          </div>
        )}

        {stage.name === "review" && <Review stage={stage} noun={noun} onBack={() => setStage({ name: "choose" })} onImport={() => run(stage.rows)} />}

        {stage.name === "done" && (
          <div className="grid justify-items-center gap-3 py-8 text-center" role="status">
            <CircleCheck className="size-8 text-primary" />
            <p className="text-lg font-extrabold">{stage.result.message}</p>
            <Button onClick={onClose} className="mt-2 h-11 rounded-full px-6 font-bold">
              Done
            </Button>
          </div>
        )}

        {(stage.name === "choose" || stage.name === "review") && (
          <DialogFooter className={stage.name === "review" ? "hidden" : undefined}>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Close</DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Review({ stage, noun, onBack, onImport }: { stage: Extract<Stage, { name: "review" }>; noun: string; onBack: () => void; onImport: () => void }) {
  const { lines, valid } = stage.preview;
  const problems = lines.filter((l) => !l.ok);
  const [showAll, setShowAll] = React.useState(false);
  const listed = showAll ? problems : problems.slice(0, 20);

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
        <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{stage.file}</p>
          <p className="text-[13px] text-muted-foreground">
            <span className="font-bold text-primary">{valid} ready</span>
            {problems.length > 0 && <span className="font-bold text-destructive"> · {problems.length} with problems</span>}
          </p>
        </div>
      </div>

      {problems.length > 0 && (
        <div className="rounded-xl border border-destructive/30">
          <p className="flex items-center gap-2 border-b border-destructive/30 bg-danger-light px-4 py-2.5 text-sm font-bold text-destructive">
            <CircleAlert className="size-4" />
            These rows will be skipped
          </p>
          <ul className="max-h-60 divide-y divide-border overflow-y-auto text-sm">
            {listed.map((l) => (
              <li key={l.line} className="flex gap-3 px-4 py-2">
                <span className="w-16 shrink-0 font-semibold text-muted-foreground tabular-nums">Row {l.line}</span>
                <span>{l.message}</span>
              </li>
            ))}
          </ul>
          {problems.length > listed.length && (
            <button type="button" onClick={() => setShowAll(true)} className="w-full cursor-pointer border-t border-border px-4 py-2 text-[13px] font-semibold text-primary hover:underline">
              Show all {problems.length}
            </button>
          )}
        </div>
      )}

      {valid > 0 && (
        <details className="rounded-xl border border-border">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-bold">Preview the {Math.min(valid, 200)} {noun} that will be added</summary>
          <ul className={cn("max-h-52 divide-y divide-border overflow-y-auto border-t border-border text-sm")}>
            {lines
              .filter((l) => l.ok)
              .slice(0, 200)
              .map((l) => (
                <li key={l.line} className="px-4 py-2">
                  {l.message}
                </li>
              ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack} className="h-11 rounded-full px-5 font-bold">
          Choose another file
        </Button>
        <Button disabled={valid === 0} onClick={onImport} className="h-11 gap-2 rounded-full px-6 font-bold">
          <Upload className="size-4" />
          Import {valid} {valid === 1 ? noun.replace(/s$/, "") : noun}
        </Button>
      </div>
    </div>
  );
}

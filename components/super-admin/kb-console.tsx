"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Play, RefreshCw, Square, Trash2, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/dashboard/form-bits";
import { ChapterRow } from "@/components/super-admin/kb-chapter";
import { KbCard } from "@/components/super-admin/kb-card";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { deleteKbJob, pollKbJob, rebuildKbChapter, retryKbPlan, startAllKbChapters, startKbChapter, stopKbAutoRun } from "@/lib/kb/actions";
import type { ChapterPlanView, JobView } from "@/lib/kb/jobs";
import type { KbBookSummary } from "@/lib/kb/export";
import { groupBooks, versionLabel } from "@/lib/kb/labels";

const POLL_MS = 6000;
const fmtMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const LANG = { bn: "Bangla", en: "English", auto: "language auto-detected" } as const;

/**
 * The header's Upload button: pick a PDF and it uploads straight away, no form.
 * Uses XMLHttpRequest because fetch can't report upload progress for a 100 MB file.
 */
export function UploadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const input = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string>();
  const [progress, setProgress] = React.useState<number | null>(null);

  const upload = (file: File) => {
    setError(undefined);
    const form = new FormData();
    form.set("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/kb/upload");
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
    xhr.onerror = () => {
      setProgress(null);
      setError("The upload was interrupted. Check your connection and try again.");
    };
    xhr.onload = () => {
      setProgress(null);
      let body: { job?: JobView; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.job) router.refresh();
      else setError(body.error ?? `Upload failed (${xhr.status}).`);
    };
    setProgress(0);
    xhr.send(form);
  };

  const uploading = progress !== null;
  return (
    <>
      {error && (
        <p role="alert" className="max-w-sm text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      <Button disabled={disabled || uploading} onClick={() => input.current?.click()} className="h-10 rounded-xl px-4">
        {uploading ? <Loader2 className="animate-spin" /> : <FileUp />}
        {uploading ? `Uploading ${progress}%` : "Upload PDF"}
      </Button>
    </>
  );
}

const JOB_STATUS: Record<JobView["status"], { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  uploaded: { label: "Starting…", variant: "secondary" },
  planning: { label: "Reading contents…", variant: "default" },
  planned: { label: "Ready", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

const CHAPTER_STATUS: Record<ChapterPlanView["status"], { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  pending: { label: "Not parsed", variant: "secondary" },
  parsing: { label: "Parsing…", variant: "default" },
  done: { label: "Done", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

/** A job needs checking on while the contents are being read, a chapter is parsing, or "parse all" has chapters left to start. */
const isActive = (j: JobView) => j.status === "planning" || j.status === "uploaded" || j.chapters.some((c) => c.status === "parsing") || (j.autoRun && j.chapters.some((c) => c.status === "pending"));

function JobCard({ job, onChange, onRemoved }: { job: JobView; onChange: (job: JobView) => void; onRemoved: (id: string) => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const run = (fn: () => Promise<{ job?: JobView; error?: string }>) =>
    startTransition(async () => {
      setError(undefined);
      const r = await fn();
      if (r.error) setError(r.error);
      if (r.job) onChange(r.job);
      router.refresh();
    });

  const done = job.chapters.filter((c) => c.status === "done").length;
  const parsing = job.chapters.filter((c) => c.status === "parsing").length;
  const todo = job.chapters.filter((c) => c.status === "pending" || c.status === "failed").length;

  return (
    <div className="grid gap-3 border-b border-border px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{job.meta.title}</p>
          <p className="text-[13px] text-muted-foreground">
            {job.meta.subject}
            {job.meta.classLevel ? ` · class ${job.meta.classLevel}` : ""} · {LANG[job.meta.language]} · {job.pageCount} pages · {fmtMb(job.sizeBytes)} · by {job.createdByName}
          </p>
        </div>
        <Badge variant={JOB_STATUS[job.status].variant}>
          {(job.status === "planning" || job.status === "uploaded") && <Loader2 className="animate-spin" />}
          {JOB_STATUS[job.status].label}
        </Badge>
      </div>

      {job.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {job.error}
        </p>
      )}
      <FormError>{error}</FormError>

      {(job.status === "uploaded" || job.status === "planning") && (
        <p className="text-[13px] text-muted-foreground">Reading the first pages to find the chapters and their page numbers. This takes a minute and parses nothing else.</p>
      )}

      {job.status === "failed" && !job.chapters.length && (
        <div>
          <Button variant="outline" disabled={pending} onClick={() => run(() => retryKbPlan(job.id))} className="rounded-xl">
            {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Try reading the contents again
          </Button>
        </div>
      )}

      {job.chapters.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {job.autoRun ? (
              <Button variant="outline" disabled={pending} onClick={() => run(() => stopKbAutoRun(job.id))} className="rounded-xl">
                <Square />
                Stop after the running chapters
              </Button>
            ) : (
              <Button disabled={pending || todo === 0} onClick={() => run(() => startAllKbChapters(job.id))} className="rounded-xl">
                {pending ? <Loader2 className="animate-spin" /> : <Play />}
                Parse all {todo} remaining {todo === 1 ? "chapter" : "chapters"}
              </Button>
            )}
            <p className="text-[13px] text-muted-foreground">
              {done} of {job.chapters.length} done{parsing ? ` · ${parsing} parsing` : ""}. Each chapter is parsed on its own and uses LlamaParse credits per page.
            </p>
          </div>
          <ul className="grid gap-3 text-[13px]">
            {job.chapters.map((c) => (
              <div key={c.number} className="grid gap-1">
                <ChapterRow
                  dir={c.status === "done" ? job.outDir : null}
                  number={c.number}
                  title={c.title}
                  summary={
                    <>
                      pages {c.pageFrom}-{c.pageTo}
                      {c.result ? ` · ${c.result.passages} passages · ${c.result.images} pictures · ${c.result.needsReview} to review` : ""}
                      {c.creditsUsed != null ? ` · ${c.creditsUsed} credits` : ""}
                    </>
                  }
                  trailing={
                    <>
                      <Badge variant={CHAPTER_STATUS[c.status].variant}>
                        {c.status === "parsing" && <Loader2 className="animate-spin" />}
                        {CHAPTER_STATUS[c.status].label}
                      </Badge>
                      {(c.status === "pending" || c.status === "failed") && (
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => startKbChapter(job.id, c.number))} className="rounded-lg">
                          <Play />
                          {c.status === "failed" ? "Retry" : "Parse"}
                        </Button>
                      )}
                      {c.status === "done" && (
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => rebuildKbChapter(job.id, c.number))} className="rounded-lg">
                          <RefreshCw />
                          Rebuild (free)
                        </Button>
                      )}
                    </>
                  }
                />
                {c.error && <p className="pl-7 text-[12px] font-semibold text-destructive">{c.error}</p>}
              </div>
            ))}
          </ul>
        </>
      )}

      {!parsing && job.status !== "planning" && (
        <div>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteKbJob(job.id);
                onRemoved(job.id);
                router.refresh();
              })
            }
            className="rounded-xl text-destructive"
          >
            <Trash2 />
            Delete upload
          </Button>
        </div>
      )}
    </div>
  );
}

export function KbConsole({ initialJobs, books, apiKeySet, canWrite }: { initialJobs: JobView[]; books: KbBookSummary[]; apiKeySet: boolean; canWrite: boolean }) {
  const router = useRouter();
  const [jobs, setJobs] = React.useState(initialJobs);
  const activeIds = jobs.filter(isActive).map((j) => j.id).join(",");

  // While anything is running, ask the server to check on it. A finished chapter is written to kb/.
  React.useEffect(() => {
    if (!activeIds) return;
    let stopped = false;
    const tick = async () => {
      for (const id of activeIds.split(",")) {
        const before = jobs.find((j) => j.id === id);
        const next = await pollKbJob(id).catch(() => null);
        if (stopped || !next) continue;
        setJobs((all) => all.map((j) => (j.id === next.id ? next : j)));
        const finished = before && next.chapters.some((c, i) => c.status === "done" && before.chapters[i]?.status !== "done");
        if (finished || next.status === "failed") router.refresh();
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
    // `jobs` is read only to spot newly finished chapters; restarting the timer on every poll would delay the next check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIds, router]);

  const upsert = (job: JobView) => setJobs((all) => (all.some((j) => j.id === job.id) ? all.map((j) => (j.id === job.id ? job : j)) : [job, ...all]));

  return (
    <div className="grid gap-6">
      {!canWrite && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-light px-5 py-4 text-sm font-semibold text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          This server can&apos;t write files, so uploads are off here. Run the dashboard locally or on a server with a disk, then commit the kb/ folder and deploy.
        </p>
      )}
      {!apiKeySet && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-light px-5 py-4 text-sm font-semibold text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          LLAMA_CLOUD_API_KEY is not set on the server. Add it to .env.local and restart, or parsing will fail.
        </p>
      )}

      <Panel>
        <PanelHeader title="Uploads and processing" description={jobs.length ? `${jobs.length} upload${jobs.length === 1 ? "" : "s"}` : "No uploads yet. Use Upload PDF at the top right."} />
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onChange={upsert} onRemoved={(id) => setJobs((all) => all.filter((j) => j.id !== id))} />
        ))}
      </Panel>

      <section className="grid gap-4">
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight">Knowledge base</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">What is in the kb/ folder right now. This is what ships with the app.</p>
        </div>
        {books.length === 0 ? (
          <Panel>
            <p className="px-5 py-6 text-sm text-muted-foreground">Nothing exported yet.</p>
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groupBooks(books).map((g) => {
              const chapters = g.books.reduce((n, b) => n + b.chapters.length, 0);
              const review = g.books.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.needsReview, 0), 0);
              return (
                <KbCard
                  key={g.key}
                  href={`/admin/knowledge-base/versions/${g.key}`}
                  title={versionLabel(g)}
                  stats={[
                    { label: `${g.books.length} ${g.books.length === 1 ? "subject" : "subjects"}` },
                    { label: `${chapters} ${chapters === 1 ? "chapter" : "chapters"}` },
                    ...(review ? [{ label: `${review} to review`, warn: true }] : []),
                  ]}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

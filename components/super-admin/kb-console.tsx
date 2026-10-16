"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, Play, RefreshCw, Trash2, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { deleteKbJob, pollKbJob, restructureKbJob, startKbJob } from "@/lib/kb/actions";
import type { JobView } from "@/lib/kb/jobs";
import type { KbBookSummary } from "@/lib/kb/export";

const POLL_MS = 6000;
const fmtMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const LANG = { bn: "Bangla", en: "English" } as const;

/** The upload form. Uses XMLHttpRequest because fetch can't report upload progress for a 100 MB file. */
function UploadForm({ onUploaded }: { onUploaded: (job: JobView) => void }) {
  const [error, setError] = React.useState<string>();
  const [progress, setProgress] = React.useState<number | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(undefined);
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return setError("Choose a PDF file.");

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
      if (xhr.status >= 200 && xhr.status < 300 && body.job) {
        formRef.current?.reset();
        onUploaded(body.job);
      } else {
        setError(body.error ?? `Upload failed (${xhr.status}).`);
      }
    };
    setProgress(0);
    xhr.send(form);
  };

  const uploading = progress !== null;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 p-5" noValidate>
      <FormError>{error}</FormError>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
          <FieldLabel htmlFor="kb-title">Book title</FieldLabel>
          <Input id="kb-title" name="title" placeholder="e.g. Physics, Class 9-10 (Bangla)" className={CONTROL} disabled={uploading} />
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="kb-subject">Subject key</FieldLabel>
          <Input id="kb-subject" name="subject" placeholder="physics, chemistry, higher-math" className={CONTROL} disabled={uploading} />
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="kb-class">Class</FieldLabel>
          <Input id="kb-class" name="classLevel" defaultValue="9-10" placeholder="9-10" className={CONTROL} disabled={uploading} />
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="kb-language">Language</FieldLabel>
          <select id="kb-language" name="language" defaultValue="bn" disabled={uploading} className={`${CONTROL} border-input w-full rounded-xl border px-3`}>
            <option value="bn">Bangla</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="kb-edition" optional>
            Edition year
          </FieldLabel>
          <Input id="kb-edition" name="editionYear" inputMode="numeric" placeholder="2025" className={CONTROL} disabled={uploading} />
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="kb-offset" optional>
            PDF pages before the book&apos;s page 1
          </FieldLabel>
          <Input id="kb-offset" name="printedPageOffset" inputMode="numeric" defaultValue="0" className={CONTROL} disabled={uploading} />
        </div>
      </div>
      <div className="grid gap-2">
        <FieldLabel htmlFor="kb-file">Book PDF</FieldLabel>
        <Input id="kb-file" name="file" type="file" accept="application/pdf,.pdf" className={`${CONTROL} pt-2.5`} disabled={uploading} />
        <p className="text-[13px] text-muted-foreground">Up to 300 MB. Uploading only saves the file. Nothing is sent for parsing, or billed, until you start it below.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={uploading} className="h-11 rounded-xl px-5">
          {uploading ? <Loader2 className="animate-spin" /> : <FileUp />}
          {uploading ? `Uploading ${progress}%` : "Upload PDF"}
        </Button>
      </div>
    </form>
  );
}

const STATUS: Record<JobView["status"], { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  uploaded: { label: "Ready to parse", variant: "secondary" },
  parsing: { label: "Parsing…", variant: "default" },
  done: { label: "Done", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

function JobCard({ job, onChange, onRemoved }: { job: JobView; onChange: (job: JobView) => void; onRemoved: (id: string) => void }) {
  const router = useRouter();
  const [from, setFrom] = React.useState(String(job.pageFrom));
  const [to, setTo] = React.useState(String(job.pageTo));
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

  const canStart = job.status === "uploaded" || job.status === "failed";
  const pages = Math.max(0, Number(to) - Number(from) + 1);

  return (
    <div className="grid gap-3 border-b border-border px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{job.meta.title}</p>
          <p className="text-[13px] text-muted-foreground">
            {job.meta.subject} · class {job.meta.classLevel} · {LANG[job.meta.language]} · {job.pageCount} pages · {fmtMb(job.sizeBytes)} · by {job.createdByName}
          </p>
        </div>
        <Badge variant={STATUS[job.status].variant}>{job.status === "parsing" && <Loader2 className="animate-spin" />}{STATUS[job.status].label}</Badge>
      </div>

      {job.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {job.error}
        </p>
      )}
      <FormError>{error}</FormError>

      {canStart && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <label htmlFor={`from-${job.id}`} className="text-[13px] font-bold">
              From page
            </label>
            <Input id={`from-${job.id}`} value={from} onChange={(e) => setFrom(e.target.value)} inputMode="numeric" className={`${CONTROL} w-28`} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor={`to-${job.id}`} className="text-[13px] font-bold">
              To page
            </label>
            <Input id={`to-${job.id}`} value={to} onChange={(e) => setTo(e.target.value)} inputMode="numeric" className={`${CONTROL} w-28`} />
          </div>
          <Button disabled={pending || pages < 1} onClick={() => run(() => startKbJob(job.id, Number(from), Number(to)))} className="h-11 rounded-xl px-5">
            {pending ? <Loader2 className="animate-spin" /> : <Play />}
            Parse {pages} {pages === 1 ? "page" : "pages"}
          </Button>
          <p className="basis-full text-[13px] text-muted-foreground">Uses LlamaParse credits per page. Try one chapter first to check quality and cost.</p>
        </div>
      )}

      {job.status === "parsing" && (
        <p className="text-[13px] text-muted-foreground">
          Parsing pages {job.pageFrom}-{job.pageTo}. A 30-page chapter takes about a minute and a whole book can take 15 minutes or more. You can leave this page; it carries on and the chapters appear in the knowledge base when it finishes.
        </p>
      )}

      {job.status === "done" && job.result && (
        <div className="grid gap-2">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" />
            Written to <code className="rounded bg-muted px-1.5 py-0.5">{job.result.outDir}</code>
            {job.creditsUsed != null && <span>· {job.creditsUsed} credits used</span>}
          </p>
          <ul className="grid gap-1 text-[13px]">
            {job.result.chapters.map((c) => (
              <li key={c.number} className="flex flex-wrap items-center gap-x-3">
                <span className="font-bold">
                  {c.number}. {c.title}
                </span>
                <span className="text-muted-foreground">
                  {c.topics} topics · {c.passages} passages · {c.needsReview} to review
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {job.status === "done" && (
          <Button variant="outline" disabled={pending} onClick={() => run(() => restructureKbJob(job.id))} className="rounded-xl">
            {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Rebuild files (free)
          </Button>
        )}
        {job.status !== "parsing" && (
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
        )}
      </div>
    </div>
  );
}

export function KbConsole({ initialJobs, books, apiKeySet, canWrite }: { initialJobs: JobView[]; books: KbBookSummary[]; apiKeySet: boolean; canWrite: boolean }) {
  const router = useRouter();
  const [jobs, setJobs] = React.useState(initialJobs);
  const parsingIds = jobs.filter((j) => j.status === "parsing").map((j) => j.id).join(",");

  // While anything is parsing, ask the server to check on it. A finished job writes the kb/ files.
  React.useEffect(() => {
    if (!parsingIds) return;
    let stopped = false;
    const tick = async () => {
      for (const id of parsingIds.split(",")) {
        const next = await pollKbJob(id).catch(() => null);
        if (stopped || !next) continue;
        setJobs((all) => all.map((j) => (j.id === next.id ? next : j)));
        if (next.status !== "parsing") router.refresh();
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [parsingIds, router]);

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
        <PanelHeader title="Upload a book" description="Save the textbook PDF, then choose which pages to parse." />
        {canWrite ? <UploadForm onUploaded={upsert} /> : <p className="px-5 py-6 text-sm text-muted-foreground">Uploads are turned off on this server.</p>}
      </Panel>

      <Panel>
        <PanelHeader title="Uploads and processing" description={jobs.length ? `${jobs.length} upload${jobs.length === 1 ? "" : "s"}` : "No uploads yet."} />
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onChange={upsert} onRemoved={(id) => setJobs((all) => all.filter((j) => j.id !== id))} />
        ))}
      </Panel>

      <Panel>
        <PanelHeader title="Knowledge base" description="What is in the kb/ folder right now. This is what ships with the app." />
        {books.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Nothing exported yet.</p>
        ) : (
          books.map((b) => (
            <div key={b.dir} className="grid gap-2 border-b border-border px-5 py-4 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[15px] font-bold">{b.title}</p>
                <code className="text-[12px] text-muted-foreground">{b.dir}</code>
              </div>
              <ul className="grid gap-1 text-[13px]">
                {b.chapters.map((c) => (
                  <li key={c.number} className="flex flex-wrap items-center gap-x-3">
                    <span className="font-bold">
                      {c.number}. {c.title}
                    </span>
                    <span className="text-muted-foreground">
                      {c.passages} passages · {c.needsReview} to review
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

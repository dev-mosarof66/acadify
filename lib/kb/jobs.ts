import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { KB_JOBS_DIR, KB_UPLOADS_DIR } from "./paths";

/**
 * One uploaded textbook and where its processing stands, kept as a JSON file next to the PDF.
 * No database: the dashboard only controls the run, and the result is written into the kb/ folder.
 *
 * Flow: upload the whole book -> read its contents page to find the chapters ("planning") ->
 * parse each chapter on its own.
 */
export type JobStatus = "uploaded" | "planning" | "planned" | "failed";
export type ChapterStatus = "pending" | "queued" | "parsing" | "done" | "failed";

export interface BookMeta {
  title: string;
  /** Lower-case folder key, e.g. "physics" or "higher-math". */
  subject: string;
  /** Class band as printed, e.g. "9-10"; empty when not known. */
  classLevel: string;
  /** "auto" is resolved from the parsed text when a chapter is written. */
  language: "bn" | "en" | "auto";
  editionYear: number | null;
  /** Printed page number = PDF page - this. Found from the contents page; used for citations. */
  printedPageOffset: number;
}

export interface ChapterPlan {
  number: number;
  title: string;
  /** PDF pages, 1-based, inclusive. */
  pageFrom: number;
  pageTo: number;
  status: ChapterStatus;
  parseJobId: string | null;
  creditsUsed: number | null;
  error: string | null;
  result: { topics: number; passages: number; needsReview: number; images: number } | null;
}

export interface KbJob {
  id: string;
  status: JobStatus;
  meta: BookMeta;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  pageCount: number;
  tier: string;
  /** The parse of the contents pages, while planning. */
  planJobId: string | null;
  chapters: ChapterPlan[];
  /** Folder (relative to the project) the chapters are written to, once the first one is. */
  outDir: string | null;
  error: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

const jobFile = (id: string) => path.join(KB_JOBS_DIR, `${id}.json`);
export const uploadPath = (id: string) => path.join(KB_UPLOADS_DIR, `${id}.pdf`);
/** A cut of the PDF waiting to be sent to the parser ("plan" or a chapter number). */
export const cutPath = (id: string, part: string | number) => path.join(KB_UPLOADS_DIR, `${id}.${part}.pdf`);
/** The parser's raw per-page output for the plan or one chapter, kept so structuring can be redone for free. */
export const pagesPath = (id: string, part: string | number) => path.join(KB_JOBS_DIR, `${id}.${part}.pages.json`);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isJobId = (id: string) => UUID.test(id);

async function writeJob(job: KbJob) {
  await mkdir(KB_JOBS_DIR, { recursive: true });
  const tmp = `${jobFile(job.id)}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(job, null, 2), "utf8");
  await rename(tmp, jobFile(job.id));
}

type NewJob = Pick<KbJob, "meta" | "fileName" | "sizeBytes" | "sha256" | "pageCount" | "tier" | "createdByName">;

export async function createJob(input: NewJob, id = randomUUID()) {
  const now = new Date().toISOString();
  const job: KbJob = { ...input, id, status: "uploaded", planJobId: null, chapters: [], outDir: null, error: null, createdAt: now, updatedAt: now };
  await writeJob(job);
  return job;
}

export async function getJob(id: string): Promise<KbJob | null> {
  if (!isJobId(id)) return null;
  try {
    return JSON.parse(await readFile(jobFile(id), "utf8")) as KbJob;
  } catch {
    return null;
  }
}

export async function updateJob(id: string, patch: Partial<Omit<KbJob, "id" | "createdAt">>) {
  const job = await getJob(id);
  if (!job) throw new Error("Job not found");
  const next: KbJob = { ...job, ...patch, updatedAt: new Date().toISOString() };
  await writeJob(next);
  return next;
}

/** Changes one chapter's plan entry. */
export async function updateChapter(id: string, number: number, patch: Partial<ChapterPlan>) {
  const job = await getJob(id);
  if (!job) throw new Error("Job not found");
  return updateJob(id, { chapters: job.chapters.map((c) => (c.number === number ? { ...c, ...patch } : c)) });
}

/** Newest first. Files from older versions of the job format are skipped. */
export async function listJobs(): Promise<KbJob[]> {
  let names: string[] = [];
  try {
    names = await readdir(KB_JOBS_DIR);
  } catch {
    return [];
  }
  const jobs = await Promise.all(names.filter((n) => /^[0-9a-f-]{36}\.json$/.test(n)).map((n) => getJob(n.slice(0, -5))));
  return jobs.filter((j): j is KbJob => !!j && Array.isArray(j.chapters)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Removes the upload, saved parser output and the job record. The exported kb/ files stay. */
export async function deleteJob(id: string) {
  if (!isJobId(id)) return;
  const own = (n: string) => n.startsWith(`${id}.`);
  const [jobs, uploads] = await Promise.all([readdir(KB_JOBS_DIR).catch(() => []), readdir(KB_UPLOADS_DIR).catch(() => [])]);
  await Promise.all([
    ...jobs.filter(own).map((n) => rm(path.join(KB_JOBS_DIR, n), { force: true })),
    ...uploads.filter(own).map((n) => rm(path.join(KB_UPLOADS_DIR, n), { force: true })),
  ]);
}

/** What the page needs to show a job. Never includes server file paths or the parser's job ids. */
export type ChapterPlanView = Omit<ChapterPlan, "parseJobId">;
export type JobView = Pick<KbJob, "id" | "status" | "meta" | "fileName" | "sizeBytes" | "pageCount" | "tier" | "outDir" | "error" | "createdByName" | "createdAt" | "updatedAt"> & {
  chapters: ChapterPlanView[];
};

export const toJobView = (j: KbJob): JobView => ({
  id: j.id,
  status: j.status,
  meta: j.meta,
  fileName: j.fileName,
  sizeBytes: j.sizeBytes,
  pageCount: j.pageCount,
  tier: j.tier,
  outDir: j.outDir,
  error: j.error,
  createdByName: j.createdByName,
  createdAt: j.createdAt,
  updatedAt: j.updatedAt,
  chapters: j.chapters.map((c) => ({ number: c.number, title: c.title, pageFrom: c.pageFrom, pageTo: c.pageTo, status: c.status, creditsUsed: c.creditsUsed, error: c.error, result: c.result })),
});

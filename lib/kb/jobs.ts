import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { KB_JOBS_DIR, KB_UPLOADS_DIR } from "./paths";

/**
 * One textbook upload and its processing state, kept as a JSON file next to the PDF.
 * No database: the dashboard only controls the run, and the result is written into the kb/ folder.
 */
export type JobStatus = "uploaded" | "parsing" | "done" | "failed";

export interface BookMeta {
  title: string;
  /** Lower-case folder key, e.g. "physics" or "higher-math". */
  subject: string;
  /** Class band as printed, e.g. "9-10"; empty when not known. */
  classLevel: string;
  /** "auto" is resolved from the parsed text when the chapters are written. */
  language: "bn" | "en" | "auto";
  editionYear: number | null;
  /** Printed page number = PDF page - this. Used for citations. */
  printedPageOffset: number;
}

export interface JobResult {
  outDir: string;
  chapters: { number: number; title: string; topics: number; passages: number; needsReview: number }[];
}

export interface KbJob {
  id: string;
  status: JobStatus;
  meta: BookMeta;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  pageCount: number;
  /** Page range sent to the parser (1-based, inclusive). */
  pageFrom: number;
  pageTo: number;
  tier: string;
  parseJobId: string | null;
  creditsUsed: number | null;
  result: JobResult | null;
  error: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

const jobFile = (id: string) => path.join(KB_JOBS_DIR, `${id}.json`);
export const uploadPath = (id: string) => path.join(KB_UPLOADS_DIR, `${id}.pdf`);
export const pagesPath = (id: string) => path.join(KB_JOBS_DIR, `${id}.pages.json`);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isJobId = (id: string) => UUID.test(id);

async function writeJob(job: KbJob) {
  await mkdir(KB_JOBS_DIR, { recursive: true });
  const tmp = `${jobFile(job.id)}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(job, null, 2), "utf8");
  await rename(tmp, jobFile(job.id));
}

export async function createJob(input: Omit<KbJob, "id" | "status" | "parseJobId" | "creditsUsed" | "result" | "error" | "createdAt" | "updatedAt">, id = randomUUID()) {
  const now = new Date().toISOString();
  const job: KbJob = { ...input, id, status: "uploaded", parseJobId: null, creditsUsed: null, result: null, error: null, createdAt: now, updatedAt: now };
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

/** Newest first. */
export async function listJobs(): Promise<KbJob[]> {
  let names: string[] = [];
  try {
    names = await readdir(KB_JOBS_DIR);
  } catch {
    return [];
  }
  const jobs = await Promise.all(
    names
      .filter((n) => /^[0-9a-f-]{36}\.json$/.test(n))
      .map((n) => getJob(n.slice(0, -5)))
  );
  return jobs.filter((j): j is KbJob => !!j).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Removes the upload, the saved parser output and the job record. The exported kb/ files stay. */
export async function deleteJob(id: string) {
  if (!isJobId(id)) return;
  await Promise.all([rm(uploadPath(id), { force: true }), rm(pagesPath(id), { force: true }), rm(jobFile(id), { force: true })]);
}

/** What the page needs to show a job. Never includes server file paths or the parser's job id. */
export type JobView = Pick<KbJob, "id" | "status" | "meta" | "fileName" | "sizeBytes" | "pageCount" | "pageFrom" | "pageTo" | "tier" | "creditsUsed" | "result" | "error" | "createdByName" | "createdAt" | "updatedAt">;

export const toJobView = (j: KbJob): JobView => ({
  id: j.id,
  status: j.status,
  meta: j.meta,
  fileName: j.fileName,
  sizeBytes: j.sizeBytes,
  pageCount: j.pageCount,
  pageFrom: j.pageFrom,
  pageTo: j.pageTo,
  tier: j.tier,
  creditsUsed: j.creditsUsed,
  result: j.result,
  error: j.error,
  createdByName: j.createdByName,
  createdAt: j.createdAt,
  updatedAt: j.updatedAt,
});

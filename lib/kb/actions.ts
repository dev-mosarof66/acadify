"use server";

import { assertSuperAdmin } from "@/lib/auth/session";
import { readKbChapter, type ChapterView } from "./export";
import { deleteJob, getJob, toJobView, updateJob, type JobView } from "./jobs";
import { advanceJob, startAll, startChapter, startPlan, structureChapter } from "./process";

type Result = { job?: JobView; error?: string };

/** Parses one chapter. This is the step that uses LlamaParse credits. */
export async function startKbChapter(jobId: string, number: number): Promise<Result> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  if (!job.chapters.some((c) => c.number === number)) return { error: "No such chapter." };
  return { job: toJobView(await startChapter(job.id, number)) };
}

/** Parses every chapter that isn't done, a couple at a time. */
export async function startAllKbChapters(jobId: string): Promise<Result> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  const next = await startAll(job.id);
  return next ? { job: toJobView(next) } : { error: "Job not found." };
}

/** Tries reading the contents page again, e.g. after a failure. */
export async function retryKbPlan(jobId: string): Promise<Result> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  return { job: toJobView(await startPlan(job.id)) };
}

/** Called every few seconds while anything is running; cheap when there is nothing new. */
export async function pollKbJob(jobId: string): Promise<JobView | null> {
  await assertSuperAdmin();
  const job = await advanceJob(jobId);
  return job ? toJobView(job) : null;
}

/** Rebuilds a chapter's kb/ files from its saved parser output. Free: nothing is sent to the parser. */
export async function rebuildKbChapter(jobId: string, number: number): Promise<Result> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  return { job: toJobView(await structureChapter(job.id, number)) };
}

/** Stops "parse all" so chapters already running finish but no new ones start. */
export async function stopKbAutoRun(jobId: string): Promise<Result> {
  await assertSuperAdmin();
  return { job: toJobView(await updateJob(jobId, { autoRun: false })) };
}

/** Removes the upload and the job record. Chapters already written to kb/ are kept. */
export async function deleteKbJob(jobId: string): Promise<{ ok: boolean }> {
  await assertSuperAdmin();
  await deleteJob(jobId);
  return { ok: true };
}

/** The extracted content of one chapter, so the dashboard can show it. */
export async function readChapter(dir: string, number: number): Promise<ChapterView | null> {
  await assertSuperAdmin();
  return readKbChapter(dir, number);
}

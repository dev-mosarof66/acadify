"use server";

import { assertSuperAdmin } from "@/lib/auth/session";
import { readKbChapter, type ChapterView } from "./export";
import { deleteJob, getJob, toJobView, type JobView } from "./jobs";
import { advanceJob, editChapter, queueChapters, startPlan, structureChapter, unqueueChapters } from "./process";

type Result = { job?: JobView; error?: string };

/**
 * Queues chapters for parsing and returns at once; the background worker does the rest, so the page
 * can be closed. Parsing uses LlamaParse credits.
 */
export async function queueKbChapters(jobId: string, numbers: number[]): Promise<Result> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  const known = new Set(job.chapters.map((c) => c.number));
  if (!numbers.length || !numbers.every((n) => known.has(n))) return { error: "No such chapter." };
  return { job: toJobView(await queueChapters(job.id, numbers)) };
}

/** Queues every chapter that isn't done or already running. */
export async function queueAllKbChapters(jobId: string): Promise<Result> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  const todo = job.chapters.filter((c) => c.status === "pending" || c.status === "failed").map((c) => c.number);
  return { job: toJobView(await queueChapters(job.id, todo)) };
}

/** Takes chapters that are still waiting out of the queue. Ones already with the parser finish. */
export async function unqueueKbChapters(jobId: string): Promise<Result> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  return { job: toJobView(await unqueueChapters(job.id)) };
}

/** Tries reading the contents page again, e.g. after a failure. */
export async function retryKbPlan(jobId: string): Promise<Result> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  return { job: toJobView(await startPlan(job.id)) };
}

/** What the page shows while it is open. The worker moves jobs along on its own; this also nudges it. */
export async function pollKbJob(jobId: string): Promise<JobView | null> {
  await assertSuperAdmin();
  const job = await advanceJob(jobId);
  return job ? toJobView(job) : null;
}

/** Corrects a chapter's name and PDF page range, e.g. when the contents page was misread. */
export async function editKbChapter(jobId: string, number: number, edit: { title: string; pageFrom: number; pageTo: number }): Promise<Result> {
  await assertSuperAdmin();
  const r = await editChapter(jobId, number, { title: String(edit.title ?? ""), pageFrom: Number(edit.pageFrom), pageTo: Number(edit.pageTo) });
  return r.error ? { error: r.error } : { job: r.job ? toJobView(r.job) : undefined };
}

/** Rebuilds a chapter's kb/ files from its saved parser output. Free: nothing is sent to the parser. */
export async function rebuildKbChapter(jobId: string, number: number): Promise<Result> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  return { job: toJobView(await structureChapter(job.id, number)) };
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

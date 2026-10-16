"use server";

import { assertSuperAdmin } from "@/lib/auth/session";
import { deleteJob, getJob, toJobView, updateJob, type JobView } from "./jobs";
import { advanceJob, startParse, structureJob } from "./process";

/** Starts parsing the chosen page range. This is the step that uses LlamaParse credits. */
export async function startKbJob(jobId: string, pageFrom: number, pageTo: number): Promise<{ job?: JobView; error?: string }> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  if (job.status === "parsing") return { job: toJobView(job) };
  if (!Number.isInteger(pageFrom) || !Number.isInteger(pageTo) || pageFrom < 1 || pageTo > job.pageCount || pageFrom > pageTo) {
    return { error: `Pages must be between 1 and ${job.pageCount}, and "from" can't be after "to".` };
  }
  await updateJob(job.id, { pageFrom, pageTo });
  return { job: toJobView(await startParse(job.id)) };
}

/** Called every few seconds while a job is parsing; cheap when there is nothing new. */
export async function pollKbJob(jobId: string): Promise<JobView | null> {
  await assertSuperAdmin();
  const job = await advanceJob(jobId);
  return job ? toJobView(job) : null;
}

/** Rebuilds the kb/ files from the saved parser output. Free: nothing is sent to the parser. */
export async function restructureKbJob(jobId: string): Promise<{ job?: JobView; error?: string }> {
  await assertSuperAdmin();
  const job = await getJob(jobId);
  if (!job) return { error: "Job not found." };
  return { job: toJobView(await structureJob(job.id)) };
}

/** Removes the upload and the job record. Chapters already written to kb/ are kept. */
export async function deleteKbJob(jobId: string): Promise<{ ok: boolean }> {
  await assertSuperAdmin();
  await deleteJob(jobId);
  return { ok: true };
}

import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { aiApprovals, aiJobs, db } from "@/lib/db";
import type { Paper, PaperParams } from "./paper";

export type PaperJobStatus = (typeof aiJobs.$inferSelect)["status"];

export interface PaperJobRow {
  id: string;
  title: string;
  status: PaperJobStatus;
  requestedBy: string;
  requestedByName: string;
  costBdt: number;
  createdAt: string;
}

/** The institute's question papers, newest first. */
export async function getPaperJobs(instituteId: string): Promise<PaperJobRow[]> {
  const rows = await db
    .select({ id: aiJobs.id, title: aiJobs.title, status: aiJobs.status, requestedBy: aiJobs.requestedBy, requestedByName: aiJobs.requestedByName, costBdt: aiJobs.costBdt, createdAt: aiJobs.createdAt })
    .from(aiJobs)
    .where(and(eq(aiJobs.instituteId, instituteId), eq(aiJobs.kind, "question_paper")))
    .orderBy(desc(aiJobs.createdAt))
    .limit(100);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export interface PaperJob extends PaperJobRow {
  params: PaperParams;
  /** The approved version once approved, else the AI's draft. */
  paper: Paper | null;
  warnings: string[];
  error: string | null;
  model: string;
  approval: { decision: "approved" | "edited" | "rejected"; note: string; decidedByName: string; decidedAt: string } | null;
}

export async function getPaperJob(instituteId: string, id: string): Promise<PaperJob | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select({ job: aiJobs, approval: aiApprovals })
    .from(aiJobs)
    .leftJoin(aiApprovals, eq(aiApprovals.jobId, aiJobs.id))
    .where(and(eq(aiJobs.id, id), eq(aiJobs.instituteId, instituteId), eq(aiJobs.kind, "question_paper")))
    .limit(1);
  if (!row) return null;
  const { approval } = row;
  let { job } = row;
  // A job still "writing" after 10 minutes was cut off (server restart or time limit): let the teacher retry it
  if ((job.status === "queued" || job.status === "running") && Date.now() - job.updatedAt.getTime() > 10 * 60_000) {
    const [stale] = await db
      .update(aiJobs)
      .set({ status: "failed", error: "Writing the paper was interrupted. Please try again." })
      .where(and(eq(aiJobs.id, job.id), eq(aiJobs.status, job.status)))
      .returning();
    if (stale) job = stale;
  }
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    requestedBy: job.requestedBy,
    requestedByName: job.requestedByName,
    costBdt: job.costBdt,
    createdAt: job.createdAt.toISOString(),
    params: job.params as PaperParams,
    paper: ((approval?.finalOutput ?? job.output) as Paper | null) ?? null,
    warnings: job.warnings,
    error: job.error,
    model: job.model,
    approval: approval ? { decision: approval.decision, note: approval.note, decidedByName: approval.decidedByName, decidedAt: approval.decidedAt.toISOString() } : null,
  };
}

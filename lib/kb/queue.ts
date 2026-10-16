/**
 * Decisions for the background worker, kept pure so they can be tested.
 * A chapter goes pending -> queued (asked for) -> parsing (handed to the parser) -> done | failed.
 */
export const MAX_PARALLEL = 2;

interface ChapterLike {
  number: number;
  status: string;
}

/** The queued chapters to hand to the parser now, in order, without going over MAX_PARALLEL running at once. */
export function chaptersToSubmit(chapters: ChapterLike[], max = MAX_PARALLEL): number[] {
  const busy = chapters.filter((c) => c.status === "parsing").length;
  return chapters
    .filter((c) => c.status === "queued")
    .slice(0, Math.max(0, max - busy))
    .map((c) => c.number);
}

/** True while the job has something the worker should be moving along. */
export function needsWork(job: { status: string; chapters: ChapterLike[] }): boolean {
  return job.status === "uploaded" || job.status === "planning" || job.chapters.some((c) => c.status === "parsing" || c.status === "queued");
}

/** True when nothing about the job has changed for `ms`. */
export const isIdle = (updatedAt: string, ms: number, now = Date.now()) => now - Date.parse(updatedAt) > ms;

// How long a hand-off to the parser may take before it is assumed to have been lost (e.g. the server restarted during the upload)
export const UPLOAD_GRACE_MS = 20_000;
export const ABANDONED_MS = 10 * 60_000;

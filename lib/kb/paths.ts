import "server-only";

import path from "node:path";

/**
 * Where the knowledge base lives on disk. The finished KB (`kb/`) is committed with the app and
 * deployed with it; `data/` holds uploads, job state and raw parser output, and stays out of git.
 */
export const KB_ROOT = process.env.KB_ROOT ? path.resolve(process.env.KB_ROOT) : path.join(process.cwd(), "acadify_kb");
export const KB_OUT_DIR = path.join(KB_ROOT, "kb");
export const KB_DATA_DIR = path.join(KB_ROOT, "data");
export const KB_JOBS_DIR = path.join(KB_DATA_DIR, "jobs");
export const KB_UPLOADS_DIR = path.join(KB_DATA_DIR, "uploads");

/** Folder a book's chapters are exported into: kb/<subject>/[class-<level>/]<language>. */
export const bookOutDir = (subject: string, classLevel: string, language: string) =>
  classLevel ? path.join(KB_OUT_DIR, subject, `class-${classLevel}`, language) : path.join(KB_OUT_DIR, subject, language);

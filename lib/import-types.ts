/** Shapes shared by the CSV import actions and the import dialog. */

/** One CSV row as column-key → text, as read from the file. */
export type ImportRow = Record<string, string>;

export interface ImportLine {
  /** Line number in the file (the header is line 1). */
  line: number;
  ok: boolean;
  /** What would be created, or why the row can't be imported. */
  message: string;
}

export type ImportPreview = { ok: true; lines: ImportLine[]; valid: number } | { ok: false; error: string };
export type ImportCommit = { ok: true; imported: number; skipped: number; message: string } | { ok: false; error: string };

/** The most rows one import may hold. */
export const IMPORT_MAX_ROWS = 1000;

/**
 * Book details are optional on upload. Whatever the admin leaves blank is worked out from the
 * file name ("Higher_Math_Bangla_Version.pdf"), and the language, if still unknown, from the
 * parsed pages. Pure functions.
 */
export type Language = "bn" | "en";

export interface GuessedMeta {
  title: string;
  /** Folder key, e.g. "higher-math". */
  subject: string;
  /** "9-10", "6", or "" when the file name doesn't say. */
  classLevel: string;
  /** "auto" means: decide from the parsed text. */
  language: Language | "auto";
}

// Words in a file name that say nothing about the subject.
const NOISE = new Set(["version", "book", "textbook", "pdf", "nctb", "final", "new", "edition", "bangla", "bengali", "bn", "english", "en", "class", "std", "ssc", "hsc"]);

export function guessMeta(fileName: string): GuessedMeta {
  const base = fileName.replace(/\.pdf$/i, "").replace(/[_.]+/g, " ").replace(/\s+/g, " ").trim();
  const lower = base.toLowerCase();

  const cls = lower.match(/class[\s-]*(\d{1,2})(?:\s*[-–to]+\s*(\d{1,2}))?/);
  const classLevel = cls ? (cls[2] ? `${cls[1]}-${cls[2]}` : cls[1]) : "";

  const language: GuessedMeta["language"] = /\b(bangla|bengali|bn)\b/.test(lower) ? "bn" : /\b(english|en)\b/.test(lower) ? "en" : "auto";

  const words = lower
    .replace(/class[\s-]*\d{1,2}(?:\s*[-–to]+\s*\d{1,2})?/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !NOISE.has(w) && !/^\d+$/.test(w));
  const subject = words.join("-").slice(0, 40).replace(/^-+|-+$/g, "") || "book";

  const title = base.slice(0, 200) || "Untitled book";
  return { title, subject, classLevel, language };
}

/** "bn" when most letters in the text are Bengali script, else "en". */
export function detectLanguage(text: string): Language {
  const bengali = (text.match(/[ঀ-৿]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return bengali > latin * 0.3 ? "bn" : "en";
}

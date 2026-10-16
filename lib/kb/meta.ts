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

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

// Class names as printed on Bangladeshi textbooks: "৯ম-১০ম শ্রেণি", "নবম-দশম শ্রেণি", "Class Nine-Ten", "Class IX-X"
const BN_WORDS: Record<string, number> = { ষষ্ঠ: 6, সপ্তম: 7, অষ্টম: 8, নবম: 9, দশম: 10, একাদশ: 11, দ্বাদশ: 12 };
const EN_WORDS: Record<string, number> = { six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const ROMAN: Record<string, number> = { vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };

const bnWords = Object.keys(BN_WORDS).join("|");
const BN_RANGE_WORDS = new RegExp(`(${bnWords})\\s*(?:[-–]|ও|এবং)\\s*(${bnWords})\\s*শ্রেণি`, "g");
const BN_SINGLE_WORD = new RegExp(`(${bnWords})\\s*শ্রেণি`, "g");
const BN_RANGE_NUM = /(\d{1,2})\s*(?:ম|ষ্ঠ|শ)?\s*(?:[-–]|ও|এবং)\s*(\d{1,2})\s*(?:ম|ষ্ঠ|শ)?\s*শ্রেণি/g;
const BN_SINGLE_NUM = /(\d{1,2})\s*(?:ম|ষ্ঠ|শ)?\s*শ্রেণি/g;
const EN_NUM = /class\s+(\d{1,2})(?:\s*(?:[-–]|to)\s*(\d{1,2}))?/gi;
const EN_WORD_RE = /class\s+(six|seven|eight|nine|ten|eleven|twelve|vi{1,3}|ix|x|xi{1,2})(?:\s*(?:[-–]|to)\s*(six|seven|eight|nine|ten|eleven|twelve|vi{1,3}|ix|x|xi{1,2}))?\b/gi;

const valid = (n: number) => n >= 6 && n <= 12;
const label = (a: number, b?: number) => (b && b !== a ? `${a}-${b}` : String(a));

/** The class (or class band, e.g. "9-10") the text says the book is for, or "" when it doesn't say. */
export function detectClassLevel(text: string): string {
  const t = toAscii(text);
  const votes = new Map<string, number>();
  const vote = (a: number, b?: number) => {
    if (!valid(a) || (b !== undefined && !valid(b))) return;
    const key = label(a, b);
    votes.set(key, (votes.get(key) ?? 0) + 1);
  };
  for (const m of t.matchAll(BN_RANGE_WORDS)) vote(BN_WORDS[m[1]], BN_WORDS[m[2]]);
  for (const m of t.matchAll(BN_RANGE_NUM)) vote(Number(m[1]), Number(m[2]));
  for (const m of t.matchAll(BN_SINGLE_WORD)) vote(BN_WORDS[m[1]]);
  for (const m of t.matchAll(BN_SINGLE_NUM)) vote(Number(m[1]));
  for (const m of t.matchAll(EN_NUM)) vote(Number(m[1]), m[2] ? Number(m[2]) : undefined);
  for (const m of t.matchAll(EN_WORD_RE)) {
    const num = (w: string) => EN_WORDS[w.toLowerCase()] ?? ROMAN[w.toLowerCase()];
    vote(num(m[1]), m[2] ? num(m[2]) : undefined);
  }
  // A band like 9-10 also contains single-class mentions (9, 10); prefer the band when both are present
  const bands = [...votes].filter(([k]) => k.includes("-"));
  const pool = bands.length ? bands : [...votes];
  return pool.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

/** The year a revised edition is for, from the cover line "২০২৬ শিক্ষাবর্ষের জন্য", or null. */
export function detectEditionYear(text: string): number | null {
  const m = toAscii(text).match(/(20\d{2})\s*শিক্ষাবর্ষের\s*জন্য/);
  return m ? Number(m[1]) : null;
}

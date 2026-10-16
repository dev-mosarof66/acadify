/**
 * Decides what of an extracted chapter may be fed to an AI, and in what form. Pure functions.
 *
 * The extraction keeps everything the parser found. The AI-ready copy leaves out what is not textbook
 * content (the parser's own picture descriptions, learning-outcome lists), sets exercises apart, holds
 * back passages with likely reading errors until a person has checked them, and removes markup noise.
 */

export interface AiPassage {
  id: string;
  kind: string;
  section: string | null;
  caption: string | null;
  body: string;
  reviewReasons: string[];
  printedPageStart: number;
}

/** A reviewer's decision about one passage. `original` is the parsed text it was made against. */
export interface Curation {
  status: "kept" | "excluded";
  body?: string;
  original: string;
}

export type AiState = "included" | "held" | "excluded" | "exercise";

export interface AiDecision {
  state: AiState;
  reason: string;
}

/** Kinds that count as textbook content. Figures only qualify as captions (see isFigureDescription). */
const CONTENT_KINDS = new Set(["text", "definition", "formula", "example", "activity", "table", "figure"]);
/** Reasons that keep a passage out until a person has looked at it. Formulas and tables are included but marked unverified. */
export const HELD_REASONS = new Set(["latin-junk"]);

const FIGURE_DESCRIPTION = /^(drawing|illustration|photo|photograph|image|diagram|chart|graph|picture):/i;
/** The parser's own description of a picture ("drawing: a ruler..."), as opposed to the book's caption ("চিত্র ১.২ : ..."). */
export const isFigureDescription = (body: string) => FIGURE_DESCRIPTION.test(body.trim());

export function classify(p: AiPassage, cur?: Curation): AiDecision {
  if (cur?.status === "excluded") return { state: "excluded", reason: "left out by a reviewer" };
  if (p.kind === "exercise") return { state: "exercise", reason: "a question, not content" };
  if (p.kind === "objective") return { state: "excluded", reason: "learning outcomes, not content" };
  if (p.kind === "figure" && isFigureDescription(p.body)) return { state: "excluded", reason: "picture description written by the parser" };
  if (!CONTENT_KINDS.has(p.kind)) return { state: "excluded", reason: `${p.kind} is not content` };
  if (cur) return { state: "included", reason: cur.body !== undefined ? "edited by a reviewer" : "checked by a reviewer" };
  const held = p.reviewReasons.filter((r) => HELD_REASONS.has(r));
  if (held.length) return { state: "held", reason: `needs a check: ${held.join(", ")}` };
  return { state: "included", reason: "automatic" };
}

/** An HTML table as plain rows: "a | b | c", one per line. */
export function tableToText(html: string): string {
  return html
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/t[hd]>/gi, " | ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((row) => row.replace(/\s+/g, " ").replace(/\s*\|\s*$/, "").trim())
    .filter(Boolean)
    .join("\n");
}

/** The passage's text without markup noise. LaTeX is kept: an AI reads it fine. */
export function cleanText(kind: string, body: string): string {
  const text = kind === "table" ? tableToText(body) : body;
  return text
    .replace(/\*\*/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface AiRecord {
  id: string;
  chapter: number;
  chapterTitle: string;
  topic: string;
  topicTitle: string;
  section: string | null;
  kind: string;
  /** Printed page number in the book, for citations. */
  page: number;
  text: string;
  /** True when a person has checked it, or nothing about it needed checking. */
  verified: boolean;
  reviewReasons: string[];
}

export interface AiChapterInput {
  number: number;
  title: string;
  topics: { key: string; title: string; passages: (AiPassage & { curation?: Curation })[] }[];
}

export interface AiReport {
  included: number;
  held: number;
  excluded: number;
  exercises: number;
  /** How many passages were left out or held, by reason. */
  reasons: Record<string, number>;
}

export function buildAiReady(chapter: AiChapterInput): { records: AiRecord[]; exercises: AiRecord[]; report: AiReport } {
  const records: AiRecord[] = [];
  const exercises: AiRecord[] = [];
  const report: AiReport = { included: 0, held: 0, excluded: 0, exercises: 0, reasons: {} };

  for (const topic of chapter.topics) {
    for (const p of topic.passages) {
      const decision = classify(p, p.curation);
      if (decision.state === "excluded" || decision.state === "held") {
        report[decision.state] += 1;
        report.reasons[decision.reason] = (report.reasons[decision.reason] ?? 0) + 1;
        continue;
      }
      const caption = p.caption ? `${cleanText("text", p.caption)}\n` : "";
      const record: AiRecord = {
        id: p.id,
        chapter: chapter.number,
        chapterTitle: chapter.title,
        topic: topic.key,
        topicTitle: topic.title,
        section: p.section,
        kind: p.kind,
        page: p.printedPageStart,
        text: caption + cleanText(p.kind, p.curation?.body ?? p.body),
        verified: !!p.curation || p.reviewReasons.length === 0,
        reviewReasons: p.reviewReasons,
      };
      if (decision.state === "exercise") {
        exercises.push(record);
        report.exercises += 1;
      } else {
        records.push(record);
        report.included += 1;
      }
    }
  }
  return { records, exercises, report };
}

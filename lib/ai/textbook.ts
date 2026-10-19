import "server-only";

import { groundingFor, type Grounding } from "@/lib/kb/ground";
import { loadIndex } from "@/lib/kb/index-store";
import type { PaperParams } from "./paper";

/*
 * Grounds a question paper in the NCTB textbook. The institute's class and subject are free text ("Class 9",
 * "পদার্থবিজ্ঞান"), so they are mapped to the knowledge base's books; chapters the teacher typed as numbers
 * ("Chapters 1-3", "অধ্যায় ২ থেকে ৪") select those chapters, anything else is used as a search.
 * A class or subject the knowledge base does not cover simply gets no textbook block.
 */

const DIGITS = "০১২৩৪৫৬৭৮৯";
const ascii = (s: string) => s.replace(/[০-৯]/g, (d) => String(DIGITS.indexOf(d)));

/** The knowledge base's subject key for a subject name, or null when it has no such book. */
export function kbSubjectFor(name: string): string | null {
  const n = name.toLowerCase();
  if (/উচ্চতর\s*গণিত|higher\s*math|\bhigh(er)?\s*mathematics\b/.test(n)) return "higher-math";
  if (/পদার্থ|physics/.test(n)) return "physics";
  if (/রসায়ন|chemistry/.test(n)) return "chemistry";
  return null;
}

/** "9-10" when the class is Nine or Ten (the NCTB SSC books the knowledge base holds), else null. */
export function kbClassFor(className: string): string | null {
  const n = ascii(className).toLowerCase();
  if (/নবম|দশম|\bnine\b|\bten\b/.test(n)) return "9-10";
  return /(?<![0-9])(9|10)(?![0-9])/.test(n) ? "9-10" : null;
}

/** Chapter numbers a teacher wrote: "1, 2 and 3", "ch 2-4", "অধ্যায় ১ থেকে ৩". Empty when none are given as numbers. */
export function parseChapterNumbers(text: string): number[] {
  const t = ascii(text);
  const SEP = String.raw`(?:\s*(?:,|;|&|and|ও|এবং)\s*)`;
  const RANGE = String.raw`(?:\s*(?:-|–|—|to|থেকে)\s*)`;
  const NUM = String.raw`\d{1,2}`;
  const LIST = `${NUM}(?:(?:${RANGE}|${SEP})${NUM})*`;
  // either the whole text is just numbers, or the numbers follow a chapter word
  const whole = new RegExp(`^\\s*${LIST}\\s*$`, "i").test(t) ? [t] : [];
  const after = [...t.matchAll(new RegExp(`(?:chapters?|chap\\.?|ch\\.?|অধ্যায়)\\s*[:：-]?\\s*(${LIST})`, "gi"))].map((m) => m[1]);
  const out = new Set<number>();
  for (const part of [...whole, ...after]) {
    for (const piece of part.split(new RegExp(SEP.replace(/\(\?:/g, "(?:"), "i"))) {
      const range = piece.match(new RegExp(`(${NUM})${RANGE}(${NUM})`, "i"));
      if (range) {
        const [a, b] = [Number(range[1]), Number(range[2])];
        for (let c = Math.min(a, b); c <= Math.max(a, b) && c - Math.min(a, b) < 20; c++) out.add(c);
      } else {
        for (const m of piece.matchAll(/\d{1,2}/g)) out.add(Number(m[0]));
      }
    }
  }
  return [...out].filter((c) => c >= 1 && c <= 30).sort((a, b) => a - b);
}

export interface TextbookBlock {
  /** The text block to put before the request. */
  text: string;
  /** For the teacher: what the paper was based on. */
  summary: string;
  grounding: Grounding;
}

/** About 20,000 tokens of passages: a few taka of input per paper, and enough of each chapter to ask about. */
const MAX_CHARS = 36000;

/**
 * The textbook passages to write the paper from, or null when this class or subject is not covered. Never throws:
 * a problem with the knowledge base must not stop a paper from being written.
 */
export async function textbookFor(params: Pick<PaperParams, "className" | "subjectName" | "chapters">): Promise<{ block: TextbookBlock | null; note?: string }> {
  const subject = kbSubjectFor(params.subjectName);
  const classLevel = kbClassFor(params.className);
  if (!subject || !classLevel) return { block: null };
  try {
    if (!(await loadIndex())) return { block: null, note: "The textbook index isn't built yet, so this paper isn't grounded in the textbook." };
    const chapters = parseChapterNumbers(params.chapters);
    const grounding = chapters.length
      ? await spreadOver(subject, classLevel, chapters)
      : await groundingFor({ subject, classLevel, query: params.chapters, limit: 12 });
    if (!grounding.sources.length) return { block: null, note: "No textbook passages matched these chapters, so this paper isn't grounded in the textbook." };
    const used = [...new Set(grounding.sources.map((s) => s.chapter))].sort((a, b) => a - b);
    const pages = grounding.sources.flatMap((s) => s.pages);
    return {
      block: {
        grounding,
        summary: `Based on the NCTB textbook: chapter${used.length > 1 ? "s" : ""} ${used.join(", ")} (pp. ${Math.min(...pages)}-${Math.max(...pages)}).`,
        text: `Textbook passages (NCTB ${params.subjectName}, Class 9-10). They are the factual basis for the paper: write questions and answer guides from them, and do not state anything that contradicts them. Each passage is labelled [S#] with its chapter and page.\n\n${grounding.context}`,
      },
    };
  } catch (err) {
    console.error("[exam-studio] textbook grounding failed", err);
    return { block: null, note: "The textbook couldn't be searched, so this paper isn't grounded in the textbook." };
  }
}

/** The chapters the teacher named, each with its share of the size budget, so a later chapter is not squeezed out by an earlier one. */
async function spreadOver(subject: string, classLevel: string, chapters: number[]): Promise<Grounding> {
  const share = Math.floor(MAX_CHARS / chapters.length);
  const parts = await Promise.all(chapters.map((chapter) => groundingFor({ subject, classLevel, chapters: [chapter], maxChars: share })));
  // renumber the sources S1..Sn across chapters
  const sources = parts.flatMap((p) => p.sources);
  const context = parts.flatMap((p) => p.context.split(/\n\n(?=\[S\d+\] )/)).map((block, i) => block.replace(/^\[S\d+\]/, `[S${i + 1}]`)).join("\n\n");
  return { context, sources: sources.map((s, i) => ({ ...s, label: `S${i + 1}` })), thinned: parts.some((p) => p.thinned), mode: "listing" };
}

/** Rules that go with the textbook block. */
export const TEXTBOOK_RULES = `Textbook rules: the textbook passages above are the facts. Base each question and answer guide on them and name the textbook chapter in each question's chapter field. Passages may mention figures that are not shown: do not write a question that depends on a figure the passage does not describe in words. Where the teacher's lecture sheets emphasise something, follow them for emphasis but keep to the textbook for facts.`;

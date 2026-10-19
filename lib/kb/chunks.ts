/**
 * Regroups the AI-ready passages into chunks an AI can use. Pure functions.
 *
 * The parser breaks a page into lines, so a passage is often a fragment: "কাজেই", "অর্থাৎ", one line of an
 * equation, an MCQ stem without its options. Fed to an embedding or a question writer on their own they mean
 * nothing, and can mislead. A chunk is a whole explanation: a worked example stays in one piece, a formula stays
 * with the sentence that introduces it, a table stays whole, and a lead-in line stays with what it leads into.
 *
 * Two pools come out: lesson chunks (what a question or a lecture sheet may be grounded in) and exercise items
 * (existing questions, kept apart so a new question is never "grounded" in an old one).
 */
import type { AiRecord } from "./aiready";
import { normalizeDigits } from "./mdtree";

export interface ChunkBook {
  id: string;
  subject: string;
  classLevel: string;
  language: string;
  /** "page-checked" once the extraction was compared with the printed pages; anything else must not be released. */
  trust: string;
}

export interface Chunk {
  id: string;
  book: string;
  subject: string;
  classLevel: string;
  language: string;
  trust: string;
  chapter: number;
  chapterTitle: string;
  topic: string;
  topicTitle: string;
  /** Printed page numbers, for citations. */
  pages: [number, number];
  kinds: string[];
  text: string;
  /** What to embed: the chunk with where it sits in the book, so a search for a topic finds it. */
  embedText: string;
  passageIds: string[];
  chars: number;
  hasFormula: boolean;
  hasExample: boolean;
  /** Figures the text points to ("৪.০১"), and the ones whose picture is not in the knowledge base. */
  figureRefs: string[];
  missingFigures: string[];
}

export interface ExerciseItem {
  id: string;
  book: string;
  subject: string;
  classLevel: string;
  trust: string;
  chapter: number;
  chapterTitle: string;
  topic: string;
  pages: [number, number];
  /** mcq: a stem with ক-ঘ options; cq: a stimulus with four parts; short: anything else. */
  type: "mcq" | "cq" | "short";
  text: string;
  passageIds: string[];
}

const TARGET = 1200;
const MAX = 2600;
const MIN_TAIL = 80;
const FRAGMENT = 60;

const FIGURE_REF = /চিত্র\s*([০-৯0-9]+\s*[.\-–]\s*[০-৯0-9]+)/g;
const figNumber = (raw: string) => normalizeDigits(raw).replace(/\s+/g, "").replace(/[-–]/g, ".");

/** Numbers of the figures a text refers to, in the form "4.01". */
export function figureRefsOf(text: string): string[] {
  return [...new Set([...text.matchAll(FIGURE_REF)].map((m) => figNumber(m[1])))];
}

/** A line that only introduces what follows: it ends with ":", "," "=" or is a bare connective. */
const isLeadIn = (t: string) => /[:：,=]\s*$/.test(t.trim()) || /^(কাজেই|অর্থাৎ|আবার|কিংবা|এবং|তাহলে|সুতরাং|অতএব|যেমন)[,:]?\s*$/.test(t.trim());

type Unit = { text: string; rec: AiRecord };

function toChunk(units: Unit[], seq: number, book: ChunkBook, available: Set<string>): Chunk {
  const first = units[0].rec;
  const text = units.map((u) => u.text).join("\n\n");
  const refs = figureRefsOf(text);
  const pages = units.map((u) => u.rec.page);
  return {
    id: `${first.id.replace(/-t[^-]+-p\d+$/, "")}-k${String(seq).padStart(3, "0")}`,
    book: book.id,
    subject: book.subject,
    classLevel: book.classLevel,
    language: book.language,
    trust: book.trust,
    chapter: first.chapter,
    chapterTitle: first.chapterTitle,
    topic: first.topic,
    topicTitle: first.topicTitle,
    pages: [Math.min(...pages), Math.max(...pages)],
    kinds: [...new Set(units.map((u) => u.rec.kind))],
    text,
    embedText: `${book.subject} · class ${book.classLevel} · অধ্যায় ${first.chapter} ${first.chapterTitle} · ${first.topicTitle}\n${text}`,
    passageIds: units.map((u) => u.rec.id),
    chars: text.length,
    hasFormula: units.some((u) => u.rec.kind === "formula" || /\$/.test(u.text)),
    hasExample: units.some((u) => u.rec.kind === "example"),
    figureRefs: refs,
    missingFigures: refs.filter((r) => !available.has(r)),
  };
}

/**
 * Numbers of the figures whose picture is in the knowledge base. The picture file hangs on the parser's description of
 * the figure; the book's caption ("চিত্র ৪.০১: ...") is the passage after it, so the number is read from the next few.
 */
export function figuresWithPictures(passages: { kind: string; body: string; caption?: string | null; image?: string | null }[]): Set<string> {
  const have = new Set<string>();
  passages.forEach((p, i) => {
    if (!p.image) return;
    for (const q of passages.slice(i, i + 3)) for (const n of figureRefsOf(`${q.caption ?? ""} ${q.body}`)) have.add(n);
  });
  return have;
}

/** Lesson chunks for one chapter, from its included passages in book order. `available`: see figuresWithPictures. */
export function buildChunks(records: AiRecord[], book: ChunkBook, available: Set<string> = new Set()): Chunk[] {

  const byTopic = new Map<string, AiRecord[]>();
  for (const r of records) (byTopic.get(r.topic) ?? byTopic.set(r.topic, []).get(r.topic)!).push(r);

  const chunks: Chunk[] = [];
  for (const recs of byTopic.values()) {
    const out: Unit[][] = [];
    let buf: Unit[] = [];
    let chars = 0;
    const flush = () => {
      if (buf.length) out.push(buf);
      buf = [];
      chars = 0;
    };
    for (const rec of recs) {
      const u: Unit = { text: rec.text, rec };
      const prev = buf[buf.length - 1];
      const startsExample = rec.kind === "example" && prev?.rec.kind !== "example";
      const exampleOver = prev?.rec.kind === "example" && rec.kind !== "example" && rec.kind !== "formula" && rec.text.length >= 120 && !/^(উত্তর|সমাধান)/.test(rec.text);
      const tableBreak = rec.kind === "table" || prev?.rec.kind === "table";
      const glue = rec.kind === "formula" || rec.kind === "figure" || (prev && isLeadIn(prev.text)) || rec.text.length < FRAGMENT;
      const inExample = prev?.rec.kind === "example" && !exampleOver;
      if (buf.length && !glue && !inExample && (startsExample || tableBreak || exampleOver || (chars >= TARGET && chars + rec.text.length > TARGET))) flush();
      else if (buf.length && chars + rec.text.length > MAX && !(prev && isLeadIn(prev.text))) flush();
      buf.push(u);
      chars += rec.text.length + 2;
    }
    flush();

    // a chunk that ends on a lead-in belongs with what follows it
    for (let i = 0; i < out.length - 1; i++) {
      while (out[i].length > 1 && isLeadIn(out[i][out[i].length - 1].text)) out[i + 1].unshift(out[i].pop()!);
    }
    // tiny chunks join their neighbour
    const merged: Unit[][] = [];
    for (const g of out) {
      const len = g.reduce((s, u) => s + u.text.length, 0);
      if (len < MIN_TAIL && merged.length) merged[merged.length - 1].push(...g);
      else merged.push(g);
    }
    if (merged.length > 1 && merged[0].reduce((s, u) => s + u.text.length, 0) < MIN_TAIL) merged[1].unshift(...merged.shift()!);
    for (const g of merged) {
      // a lone figure caption says nothing without its picture
      if (g.every((u) => u.rec.kind === "figure") && g.reduce((s, u) => s + u.text.length, 0) < 150) continue;
      chunks.push(toChunk(g, chunks.length + 1, book, available));
    }
  }
  return chunks;
}

/** "১." / "1." / "২।" at the start of an exercise line: a new numbered question. */
const NUMBERED = /^\s*[০-৯0-9]+\s*[.।)]\s*/;
/** A passage, table or figure several questions are about. */
const STIMULUS = /^\s*নিচের\s+(উদ্দীপক|তথ্য|চিত্র|সারণি|ছক|বর্ণনা|অনুচ্ছেদ)/;
/** "৩ ও ৪ নং" / "5 - 7 নং": the questions a shared stimulus covers. */
const RANGE = /([০-৯0-9]+)\s*(?:ও|-|–|থেকে|এবং)\s*([০-৯0-9]+)\s*নং/;

/** Existing exercise questions as whole items (a stem with its options or its four parts), not line fragments. */
export function buildExerciseItems(exercises: AiRecord[], book: ChunkBook): ExerciseItem[] {
  const items: AiRecord[][] = [];
  for (const rec of exercises) {
    if (!items.length || NUMBERED.test(rec.text) || STIMULUS.test(rec.text)) items.push([rec]);
    else items[items.length - 1].push(rec);
  }
  const out: ExerciseItem[] = [];
  // "নিচের উদ্দীপকের আলোকে ৩ ও ৪ নং প্রশ্নের উত্তর দাও:" and its passage belong to questions 3 and 4, not to the one before
  let shared: { text: string; from: number; to: number } | null = null;
  for (const group of items) {
    const head = group[0].text;
    if (STIMULUS.test(head) && !NUMBERED.test(head)) {
      const range = head.match(RANGE);
      const from = range ? Number(normalizeDigits(range[1])) : 0;
      shared = { text: group.map((r) => r.text).join("\n"), from, to: range ? Number(normalizeDigits(range[2])) : 0 };
      continue;
    }
    const number = Number(normalizeDigits(head.match(/^\s*([০-৯0-9]+)/)?.[1] ?? "0"));
    let prefix = "";
    if (shared && number) {
      if (shared.from === 0) {
        // no question numbers given: it covers the next numbered question only
        shared.from = shared.to = number;
      }
      if (number >= shared.from && number <= shared.to) prefix = `${shared.text}\n\n`;
      else if (number > shared.to) shared = null;
    }
    const text = prefix + group.map((r) => r.text).join("\n");
    const optionLine = /^\s*\(?[কখগঘ]\)/;
    const lines = text.split("\n");
    const partLines = lines.filter((l) => optionLine.test(l));
    const options = partLines.length;
    const firstOption = lines.findIndex((l) => optionLine.test(l));
    const stem = firstOption >= 0 ? lines.slice(0, firstOption).join("\n") : text;
    // a bare instruction ("সঠিক উত্তরটির পাশে টিক দাও:") is not a question
    if (!options && !NUMBERED.test(text) && text.length < 90) continue;
    // four short options after a stem is an MCQ; a long stimulus followed by four question-parts is a creative question
    const partsAreQuestions = partLines.filter((l) => /[?]|করো|কর[।.]|ব্যাখ্যা|নির্ণয়|বিশ্লেষণ|তুলনা/.test(l)).length >= 3;
    const type: ExerciseItem["type"] = options >= 3 && partsAreQuestions && stem.length >= 120 ? "cq" : options >= 3 || /নিচের কোনটি|কোনটি সঠিক/.test(text) ? "mcq" : "short";
    const first = group[0];
    const pages = group.map((r) => r.page);
    out.push({
      id: `${first.id.replace(/-t[^-]+-p\d+$/, "")}-x${String(out.length + 1).padStart(3, "0")}`,
      book: book.id,
      subject: book.subject,
      classLevel: book.classLevel,
      trust: book.trust,
      chapter: first.chapter,
      chapterTitle: first.chapterTitle,
      topic: first.topic,
      pages: [Math.min(...pages), Math.max(...pages)],
      type,
      text,
      passageIds: group.map((r) => r.id),
    });
  }
  return out;
}

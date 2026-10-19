import "server-only";

import type { IndexedItem, LoadedIndex } from "./index-store";
import { listItems, searchKb, type SearchFilters } from "./search";

/**
 * What question writing and lecture-sheet generation call. Given a subject and the chapters or topics a teacher
 * picked (and optionally a query), it returns the textbook passages to ground the AI in, as one block of text with
 * a numbered source label on each passage, plus the sources so the output can cite pages.
 *
 * Only released lesson chunks come back: a book that has not been page-checked is never in the index, exercises are a
 * separate pool, and text that points to a figure the knowledge base has no picture for is left out by default.
 */
export interface GroundingOptions {
  subject: string;
  classLevel?: string;
  language?: string;
  chapters?: number[];
  /** Topic keys such as "4.3". */
  topics?: string[];
  /** With a query, the best matches; without one, the whole chapters or topics in book order. */
  query?: string;
  /** How many passages to return when searching (default 8). */
  limit?: number;
  /** Cap on the size of `context`. Over it, a whole-chapter listing is thinned evenly rather than cut off. */
  maxChars?: number;
  /** Keep chunks that point to a figure the knowledge base has no picture for (default false). */
  allowMissingFigures?: boolean;
  /** For tests. */
  index?: LoadedIndex;
}

export interface GroundingSource {
  label: string;
  id: string;
  book: string;
  chapter: number;
  chapterTitle: string;
  topic: string;
  topicTitle: string;
  pages: [number, number];
}

export interface Grounding {
  context: string;
  sources: GroundingSource[];
  /** True when the listing had to be thinned to fit `maxChars`. */
  thinned: boolean;
  mode: "hybrid" | "lexical" | "vector" | "listing";
  warning?: string;
}

const pageLabel = (p: [number, number]) => (p[0] === p[1] ? `p. ${p[0]}` : `pp. ${p[0]}-${p[1]}`);

export function formatContext(items: IndexedItem[]): { context: string; sources: GroundingSource[] } {
  const sources: GroundingSource[] = [];
  const blocks = items.map((it, i) => {
    const label = `S${i + 1}`;
    sources.push({ label, id: it.id, book: it.book, chapter: it.chapter, chapterTitle: it.chapterTitle, topic: it.topic, topicTitle: it.topicTitle, pages: it.pages });
    return `[${label}] Chapter ${it.chapter}: ${it.chapterTitle} > ${it.topicTitle || it.topic} (${pageLabel(it.pages)})\n${it.text}`;
  });
  return { context: blocks.join("\n\n"), sources };
}

function filterSets(o: GroundingOptions): SearchFilters[] {
  const base: SearchFilters = { subject: o.subject, classLevel: o.classLevel, language: o.language, pool: "lesson", excludeMissingFigures: !o.allowMissingFigures };
  if (o.topics?.length) return o.topics.map((topic) => ({ ...base, topic }));
  if (o.chapters?.length) return [{ ...base, chapter: o.chapters }];
  return [base];
}

export async function groundingFor(o: GroundingOptions): Promise<Grounding> {
  const sets = filterSets(o);
  const maxChars = o.maxChars ?? 12000;

  if (o.query?.trim()) {
    const limit = o.limit ?? 8;
    const results = await Promise.all(sets.map((filters) => searchKb(o.query!, { filters, limit, index: o.index })));
    const seen = new Set<string>();
    const hits = results.flatMap((r) => r.hits).sort((a, b) => b.score - a.score).filter((h) => !seen.has(h.item.id) && seen.add(h.item.id)).slice(0, limit);
    // best match first is what a reader expects; the numbering follows that order
    const { context, sources } = formatContext(hits.map((h) => h.item));
    return { context, sources, thinned: false, mode: results[0]?.mode ?? "hybrid", warning: results.find((r) => r.warning)?.warning };
  }

  const all: IndexedItem[] = [];
  const seen = new Set<string>();
  for (const filters of sets) for (const it of await listItems(filters, o.index)) if (!seen.has(it.id)) { seen.add(it.id); all.push(it); }
  // a chapter's opening blurb ("in this chapter we will see…") has nothing to ask questions about: drop it when there is real content
  const content = all.filter((it) => !/\.0$/.test(it.topic));
  let items = content.length ? content : all;
  let thinned = false;
  const size = (xs: IndexedItem[]) => xs.reduce((s, x) => s + x.text.length + 80, 0);
  if (size(items) > maxChars) {
    // keep evenly spaced chunks, as many as fit, so the whole span stays represented instead of the last chapters being cut off
    const average = size(items) / items.length;
    const keep = Math.max(1, Math.floor(maxChars / average));
    items = Array.from({ length: keep }, (_, i) => items[Math.floor((i * items.length) / keep)]);
    while (items.length > 1 && size(items) > maxChars) items = items.slice(0, -1);
    thinned = true;
  }
  const { context, sources } = formatContext(items);
  return { context, sources, thinned, mode: "listing" };
}

export interface ExemplarOptions {
  subject: string;
  classLevel?: string;
  chapters?: number[];
  type?: "mcq" | "cq" | "short";
  limit?: number;
  index?: LoadedIndex;
}

/**
 * Existing textbook exercises, for showing a model the style and difficulty of questions. Never use them as the
 * facts to write from: that is what `groundingFor` is for. Spread evenly over the chapters asked for.
 */
export async function exemplarsFor(o: ExemplarOptions): Promise<IndexedItem[]> {
  const items = (await listItems({ subject: o.subject, classLevel: o.classLevel, chapter: o.chapters, pool: "exercise" }, o.index)).filter((x) => !o.type || x.type === o.type);
  const limit = o.limit ?? 6;
  if (items.length <= limit) return items;
  const stride = items.length / limit;
  return Array.from({ length: limit }, (_, i) => items[Math.floor(i * stride)]);
}

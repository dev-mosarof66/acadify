import "server-only";

import { makeEmbedder, type EmbedConfig, type EmbedProvider, type Embedder } from "./embed";
import { loadIndex, type IndexedItem, type LoadedIndex } from "./index-store";
import { fuse } from "./lexical";

export interface SearchFilters {
  subject?: string;
  classLevel?: string;
  language?: string;
  /** One chapter number, or several. */
  chapter?: number | number[];
  /** A topic key ("4.3") or the start of one ("4" matches every topic of chapter 4). */
  topic?: string;
  /** "lesson" (default): what a question or sheet may be grounded in. "exercise": existing questions, for style only. */
  pool?: "lesson" | "exercise";
  /** Leave out lesson chunks whose text points to a figure the knowledge base has no picture for. */
  excludeMissingFigures?: boolean;
}

export interface SearchHit {
  item: IndexedItem;
  /** Fused rank score; only meaningful for ordering. */
  score: number;
  vectorRank?: number;
  lexicalRank?: number;
}

export interface SearchResult {
  hits: SearchHit[];
  /** "hybrid" normally; "lexical" when the embedding model could not be used. */
  mode: "hybrid" | "lexical" | "vector";
  /** Set when the embedder failed and the search fell back to words only. */
  warning?: string;
}

export function matchesFilters(item: IndexedItem, f: SearchFilters): boolean {
  if (item.pool !== (f.pool ?? "lesson")) return false;
  if (f.subject && item.subject !== f.subject) return false;
  if (f.classLevel && item.classLevel !== f.classLevel) return false;
  if (f.language && item.language !== f.language) return false;
  if (f.chapter !== undefined && !(Array.isArray(f.chapter) ? f.chapter : [f.chapter]).includes(item.chapter)) return false;
  if (f.topic && item.topic !== f.topic && !item.topic.startsWith(`${f.topic}.`)) return false;
  if (f.excludeMissingFigures && item.missingFigures?.length) return false;
  return true;
}

const embedders = new Map<string, Embedder>();
/** An embedder for the id an index was built with ("local:Xenova/multilingual-e5-small"), so queries and vectors match. */
export function embedderFor(id: string): Embedder {
  const hit = embedders.get(id);
  if (hit) return hit;
  const at = id.indexOf(":");
  const config: EmbedConfig = { provider: id.slice(0, at) as EmbedProvider, model: id.slice(at + 1) };
  const e = makeEmbedder(config);
  embedders.set(id, e);
  return e;
}

const dot = (v: Float32Array, offset: number, q: Float32Array) => {
  let s = 0;
  for (let i = 0; i < q.length; i++) s += v[offset + i] * q[i];
  return s;
};

export interface SearchOptions {
  filters?: SearchFilters;
  limit?: number;
  /** Words only, vectors only, or both (default). */
  mode?: "hybrid" | "lexical" | "vector";
  /** For tests: use this index and embedder instead of the built ones. */
  index?: LoadedIndex;
  embedder?: Embedder;
}

const POOL = 60;

export async function searchKb(query: string, opts: SearchOptions = {}): Promise<SearchResult> {
  const index = opts.index ?? (await loadIndex());
  if (!index) throw new Error("There is no search index yet. Build it with `npm run kb:embed`.");
  const filters = opts.filters ?? {};
  const limit = opts.limit ?? 8;
  const mode = opts.mode ?? "hybrid";
  const allowed = new Uint8Array(index.items.length);
  index.items.forEach((it, i) => (allowed[i] = matchesFilters(it, filters) ? 1 : 0));
  const ok = (i: number) => allowed[i] === 1;

  const lexical = mode === "vector" ? [] : index.bm25.search(query, POOL, ok);

  let vector: { index: number; score: number }[] = [];
  let warning: string | undefined;
  let usedVector = false;
  if (mode !== "lexical") {
    try {
      const q = await (opts.embedder ?? embedderFor(index.meta.embedder)).embedQuery(query);
      if (q.length !== index.meta.dims) throw new Error(`the query vector has ${q.length} dimensions, the index ${index.meta.dims}`);
      const scored: { index: number; score: number }[] = [];
      for (let i = 0; i < index.items.length; i++) if (ok(i)) scored.push({ index: i, score: dot(index.vectors, i * index.meta.dims, q) });
      vector = scored.sort((a, b) => b.score - a.score).slice(0, POOL);
      usedVector = true;
    } catch (err) {
      if (mode === "vector") throw err;
      warning = `Meaning search is unavailable (${err instanceof Error ? err.message : String(err)}); showing word matches only.`;
    }
  }

  const fused = fuse([vector.map((v) => ({ index: v.index, weight: 1 })), lexical.map((l) => ({ index: l.index, weight: 1 }))]);
  const vRank = new Map(vector.map((v, r) => [v.index, r + 1]));
  const lRank = new Map(lexical.map((l, r) => [l.index, r + 1]));
  const hits = [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([i, score]) => ({ item: index.items[i], score, vectorRank: vRank.get(i), lexicalRank: lRank.get(i) }));
  return { hits, mode: usedVector ? (mode === "vector" ? "vector" : "hybrid") : "lexical", warning };
}

/** The chunks (or exercise items) that match the filters, in book order: for covering a whole chapter or topic. */
export async function listItems(filters: SearchFilters, index?: LoadedIndex): Promise<IndexedItem[]> {
  const idx = index ?? (await loadIndex());
  if (!idx) throw new Error("There is no search index yet. Build it with `npm run kb:embed`.");
  return idx.items.filter((it) => matchesFilters(it, filters));
}

/** What the index covers: the subjects, and each one's chapters and topics, for pickers. */
export async function curriculum(index?: LoadedIndex) {
  const idx = index ?? (await loadIndex());
  if (!idx) return [];
  const books = new Map<string, { book: string; subject: string; classLevel: string; language: string; chapters: Map<number, { number: number; title: string; topics: Map<string, string>; chunks: number }> }>();
  for (const it of idx.items) {
    if (it.pool !== "lesson") continue;
    const b = books.get(it.book) ?? books.set(it.book, { book: it.book, subject: it.subject, classLevel: it.classLevel, language: it.language, chapters: new Map() }).get(it.book)!;
    const c = b.chapters.get(it.chapter) ?? b.chapters.set(it.chapter, { number: it.chapter, title: it.chapterTitle, topics: new Map(), chunks: 0 }).get(it.chapter)!;
    c.topics.set(it.topic, it.topicTitle);
    c.chunks += 1;
  }
  return [...books.values()].map((b) => ({ ...b, chapters: [...b.chapters.values()].sort((x, y) => x.number - y.number).map((c) => ({ number: c.number, title: c.title, chunks: c.chunks, topics: [...c.topics.entries()].map(([key, title]) => ({ key, title })) })) }));
}

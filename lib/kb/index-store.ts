import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Chunk, ExerciseItem } from "./chunks";
import { embedConfig, embedderId, type Embedder } from "./embed";
import { Bm25 } from "./lexical";
import { KB_INDEX_DIR, KB_OUT_DIR } from "./paths";

/**
 * The search index: every released chunk and exercise item with its vector, in files that are committed with the
 * app. Only books whose verification.json says "page-checked" are released; the rest are skipped and reported.
 *
 *   index/<embedder>/meta.json     which embedder, how many vectors, which books
 *   index/<embedder>/items.jsonl   one item per line (text, citation, flags)
 *   index/<embedder>/vectors.f32   the vectors, same order, little-endian float32
 */
export interface IndexedItem {
  id: string;
  pool: "lesson" | "exercise";
  hash: string;
  book: string;
  subject: string;
  classLevel: string;
  language: string;
  chapter: number;
  chapterTitle: string;
  topic: string;
  topicTitle: string;
  /** Printed page numbers, for citations. */
  pages: [number, number];
  text: string;
  kinds?: string[];
  hasFormula?: boolean;
  hasExample?: boolean;
  figureRefs?: string[];
  missingFigures?: string[];
  type?: "mcq" | "cq" | "short";
}

export interface IndexMeta {
  schema: 1;
  embedder: string;
  dims: number;
  builtAt: string;
  counts: { lesson: number; exercise: number };
  books: { id: string; subject: string; classLevel: string; lesson: number; exercise: number }[];
}

export interface LoadedIndex {
  meta: IndexMeta;
  items: IndexedItem[];
  /** items.length * meta.dims floats. */
  vectors: Float32Array;
  bm25: Bm25;
}

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");
export const indexDirFor = (id: string) => path.join(KB_INDEX_DIR, id.replace(/[^a-zA-Z0-9._-]+/g, "_"));

async function readJsonl<T>(file: string): Promise<T[]> {
  const text = await readFile(file, "utf8").catch(() => "");
  return text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as T);
}

/** Every book folder under kb/ (kb/<subject>/class-<level>/<language>) and whether it may be released. */
export async function discoverBooks(): Promise<{ dir: string; id: string; subject: string; classLevel: string; language: string; status: string }[]> {
  const out: { dir: string; id: string; subject: string; classLevel: string; language: string; status: string }[] = [];
  const dirs = async (d: string) => (await readdir(d, { withFileTypes: true }).catch(() => [])).filter((e) => e.isDirectory()).map((e) => path.join(d, e.name));
  for (const subject of await dirs(KB_OUT_DIR)) for (const cls of await dirs(subject)) for (const lang of await dirs(cls)) {
    const meta = await readFile(path.join(lang, "textbook.json"), "utf8").then(JSON.parse).catch(() => null);
    if (!meta) continue;
    const ver = await readFile(path.join(lang, "verification.json"), "utf8").then(JSON.parse).catch(() => null);
    out.push({ dir: lang, id: meta.id, subject: meta.subject, classLevel: meta.classLevel, language: meta.language, status: ver?.status ?? "unchecked" });
  }
  return out;
}

/** The items of every released book, with the text each is embedded from. */
export async function collectItems(): Promise<{ items: (IndexedItem & { embedText: string })[]; skipped: { id: string; status: string }[] }> {
  const items: (IndexedItem & { embedText: string })[] = [];
  const skipped: { id: string; status: string }[] = [];
  for (const book of await discoverBooks()) {
    if (book.status !== "page-checked") {
      skipped.push({ id: book.id, status: book.status });
      continue;
    }
    const chapters = (await readdir(path.join(book.dir, "chapters")).catch(() => [])).sort();
    for (const c of chapters) {
      const ai = path.join(book.dir, "chapters", c, "ai");
      for (const k of await readJsonl<Chunk>(path.join(ai, "chunks.jsonl"))) {
        items.push({
          id: k.id, pool: "lesson", hash: sha1(k.embedText), book: k.book, subject: k.subject, classLevel: k.classLevel, language: k.language,
          chapter: k.chapter, chapterTitle: k.chapterTitle, topic: k.topic, topicTitle: k.topicTitle, pages: k.pages, text: k.text, kinds: k.kinds,
          hasFormula: k.hasFormula, hasExample: k.hasExample, figureRefs: k.figureRefs, missingFigures: k.missingFigures, embedText: k.embedText,
        });
      }
      for (const x of await readJsonl<ExerciseItem>(path.join(ai, "exercise-items.jsonl"))) {
        const embedText = `${x.subject} · class ${x.classLevel} · অধ্যায় ${x.chapter} ${x.chapterTitle} · প্রশ্ন\n${x.text}`;
        items.push({
          id: x.id, pool: "exercise", hash: sha1(embedText), book: x.book, subject: x.subject, classLevel: x.classLevel, language: book.language,
          chapter: x.chapter, chapterTitle: x.chapterTitle, topic: x.topic, topicTitle: "", pages: x.pages, text: x.text, type: x.type, embedText,
        });
      }
    }
  }
  return { items, skipped };
}

async function readVectors(dir: string, count: number, dims: number): Promise<Float32Array | null> {
  const buf = await readFile(path.join(dir, "vectors.f32")).catch(() => null);
  if (!buf || buf.byteLength !== count * dims * 4) return null;
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

async function readIndex(dir: string): Promise<LoadedIndex | null> {
  const meta = await readFile(path.join(dir, "meta.json"), "utf8").then((t) => JSON.parse(t) as IndexMeta).catch(() => null);
  if (!meta) return null;
  const items = await readJsonl<IndexedItem>(path.join(dir, "items.jsonl"));
  const vectors = await readVectors(dir, items.length, meta.dims);
  if (!vectors) return null;
  return { meta, items, vectors, bm25: new Bm25(items.map((i) => i.text)) };
}

/**
 * Builds the index with `embedder`. Chunks whose embedding text is unchanged since the last build keep their vector,
 * so rebuilding after a few corrections only embeds the passages that changed.
 */
export async function buildIndex(embedder: Embedder, opts: { log?: (line: string) => void; onProgress?: (done: number, total: number) => void } = {}) {
  const log = opts.log ?? (() => {});
  const { items, skipped } = await collectItems();
  for (const s of skipped) log(`skipped ${s.id}: ${s.status}, not page-checked`);
  if (!items.length) throw new Error("No page-checked book has chunks to index.");

  const dir = indexDirFor(embedder.id);
  const previous = await readIndex(dir);
  const reuse = new Map<string, Float32Array>();
  if (previous) previous.items.forEach((it, i) => reuse.set(it.hash, previous.vectors.subarray(i * previous.meta.dims, (i + 1) * previous.meta.dims)));

  const todo = items.filter((it) => !reuse.has(it.hash));
  log(`${items.length} items: ${items.length - todo.length} unchanged, ${todo.length} to embed`);
  const fresh = todo.length ? await embedder.embedDocuments(todo.map((t) => t.embedText), opts.onProgress) : [];
  const byHash = new Map<string, Float32Array>(reuse);
  todo.forEach((it, i) => byHash.set(it.hash, fresh[i]));

  const dims = byHash.get(items[0].hash)!.length;
  const vectors = new Float32Array(items.length * dims);
  items.forEach((it, i) => vectors.set(byHash.get(it.hash)!, i * dims));

  const books = new Map<string, IndexMeta["books"][number]>();
  for (const it of items) {
    const b = books.get(it.book) ?? { id: it.book, subject: it.subject, classLevel: it.classLevel, lesson: 0, exercise: 0 };
    b[it.pool] += 1;
    books.set(it.book, b);
  }
  const meta: IndexMeta = {
    schema: 1, embedder: embedder.id, dims, builtAt: new Date().toISOString(),
    counts: { lesson: items.filter((i) => i.pool === "lesson").length, exercise: items.filter((i) => i.pool === "exercise").length },
    books: [...books.values()],
  };

  await mkdir(dir, { recursive: true });
  const write = async (name: string, data: string | Buffer) => {
    const tmp = path.join(dir, `${name}.${process.pid}.tmp`);
    await writeFile(tmp, data);
    await rename(tmp, path.join(dir, name));
  };
  await write("items.jsonl", items.map(({ embedText: _drop, ...rest }) => JSON.stringify(rest)).join("\n") + "\n");
  await write("vectors.f32", Buffer.from(vectors.buffer));
  await write("meta.json", JSON.stringify(meta, null, 2));
  return { meta, embedded: todo.length, reused: items.length - todo.length, skipped };
}

const cache = (globalThis as typeof globalThis & { __kbIndex?: Map<string, { stamp: number; index: LoadedIndex }> }).__kbIndex ?? new Map();
(globalThis as typeof globalThis & { __kbIndex?: typeof cache }).__kbIndex = cache;

/** The index built with `embedderIdWanted` (default: the one the environment selects, else the newest). Null when none is built. */
export async function loadIndex(embedderIdWanted?: string): Promise<LoadedIndex | null> {
  let dir: string | null = null;
  const wanted = embedderIdWanted ?? (() => { try { return embedderId(embedConfig()); } catch { return undefined; } })();
  if (wanted) dir = indexDirFor(wanted);
  const exists = async (d: string) => !!(await stat(path.join(d, "meta.json")).catch(() => null));
  if (!dir || !(await exists(dir))) {
    if (embedderIdWanted) return null;
    const all = (await readdir(KB_INDEX_DIR, { withFileTypes: true }).catch(() => [])).filter((e) => e.isDirectory()).map((e) => path.join(KB_INDEX_DIR, e.name));
    dir = null;
    for (const d of all) if (await exists(d)) dir = d;
    if (!dir) return null;
  }
  const stamp = (await stat(path.join(dir, "meta.json"))).mtimeMs;
  const hit = cache.get(dir);
  if (hit && hit.stamp === stamp) return hit.index;
  const index = await readIndex(dir);
  if (index) cache.set(dir, { stamp, index });
  return index;
}

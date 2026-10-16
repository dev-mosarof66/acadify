import "server-only";

import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildAiReady, classify, type AiDecision, type AiPassage, type AiReport, type Curation } from "./aiready";
import type { PlacedImage } from "./images";
import type { KbJob } from "./jobs";
import type { ChapterDraft } from "./mdtree";
import { bookOutDir, KB_OUT_DIR } from "./paths";
import { applyCorrections, CORRECTIONS, reviewReasons } from "./review";

const pad = (n: number) => String(n).padStart(2, "0");
const writeJson = (file: string, value: unknown) => writeFile(file, JSON.stringify(value, null, 2), "utf8");
const exists = (file: string) => access(file).then(() => true, () => false);
const rel = (p: string) => path.relative(process.cwd(), p).replaceAll("\\", "/");

export interface ExportedChapter {
  outDir: string;
  topics: number;
  passages: number;
  needsReview: number;
  images: number;
}

/**
 * Writes one chapter into the KB folder layout:
 *   kb/<subject>/[class-<level>/]<lang>/textbook.json
 *   kb/<subject>/[class-<level>/]<lang>/chapters/NN/chapter.json | chapter.md | topics/<key>.json | assets/<picture>
 * Other chapters of the same book are left alone. Pictures already saved are kept, so re-structuring
 * a chapter doesn't need the parser's (expiring) download links again.
 */
export async function exportChapter(job: KbJob, chapter: ChapterDraft, placed: PlacedImage[]): Promise<ExportedChapter> {
  const { meta } = job;
  const base = bookOutDir(meta.subject, meta.classLevel, meta.language);
  const bookId = [meta.subject, meta.classLevel, meta.language].filter(Boolean).join("-");
  const offset = meta.printedPageOffset;
  const dir = path.join(base, "chapters", pad(chapter.number));
  await mkdir(path.join(base, "chapters"), { recursive: true });

  await writeJson(path.join(base, "textbook.json"), {
    id: bookId,
    title: meta.title,
    subject: meta.subject,
    classLevel: meta.classLevel,
    language: meta.language,
    editionYear: meta.editionYear,
    sourceFile: job.fileName,
    sourceSha256: job.sha256,
    pdfPages: job.pageCount,
    printedPageOffset: offset,
    extraction: { method: "llamaparse", tier: job.tier, output: "markdown", corrections: CORRECTIONS.map((c) => `${c.name} -> ${c.to}`) },
  });

  // Fresh topic files, but keep assets/ so pictures survive a re-run
  await rm(path.join(dir, "topics"), { recursive: true, force: true });
  await mkdir(path.join(dir, "topics"), { recursive: true });
  await mkdir(path.join(dir, "assets"), { recursive: true });

  // Pictures: download the ones we don't have yet; a figure whose picture can't be had shows no picture
  const have = new Set<string>();
  for (const img of placed) {
    const file = path.join(dir, "assets", img.saveAs);
    if (await exists(file)) {
      have.add(img.saveAs);
      continue;
    }
    try {
      const res = await fetch(img.source.url);
      if (!res.ok) continue;
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      have.add(img.saveAs);
    } catch {
      /* keep going without this picture */
    }
  }

  const title = applyCorrections(chapter.title).text;
  const topics = chapter.topics
    .filter((t) => t.passages.length)
    .map((t) => ({
      id: `${bookId}-c${pad(chapter.number)}-t${t.key}`,
      key: t.key,
      title: applyCorrections(t.title).text,
      chapter: chapter.number,
      ordinal: t.ordinal,
      passages: t.passages.map((p, i) => {
        const body = applyCorrections(p.body);
        const section = p.section ? applyCorrections(p.section) : null;
        const caption = p.caption ? applyCorrections(p.caption) : null;
        const reasons = reviewReasons(p, body.changed || !!section?.changed || !!caption?.changed);
        return {
          id: `${bookId}-c${pad(chapter.number)}-t${t.key}-p${String(i + 1).padStart(3, "0")}`,
          kind: p.kind,
          section: section?.text ?? null,
          caption: caption?.text ?? null,
          body: body.text,
          image: p.image && have.has(p.image) ? p.image : null,
          formulas: p.formulas,
          pdfPageStart: p.pdfPageStart,
          pdfPageEnd: p.pdfPageEnd,
          printedPageStart: p.pdfPageStart - offset,
          printedPageEnd: p.pdfPageEnd - offset,
          reviewReasons: reasons,
          needsReview: reasons.length > 0,
        };
      }),
    }));

  for (const t of topics) await writeJson(path.join(dir, "topics", `${t.key}.json`), t);

  const all = topics.flatMap((t) => t.passages);
  const needsReview = all.filter((p) => p.needsReview).length;
  const images = all.filter((p) => p.image).length;
  const byKind: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  for (const p of all) {
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    for (const r of p.reviewReasons) byReason[r] = (byReason[r] ?? 0) + 1;
  }
  await writeJson(path.join(dir, "chapter.json"), {
    id: `${bookId}-c${pad(chapter.number)}`,
    textbookId: bookId,
    number: chapter.number,
    title,
    englishTitle: chapter.englishTitle,
    pdfPages: [chapter.pdfPageStart, chapter.pdfPageEnd],
    printedPages: [chapter.pdfPageStart - offset, chapter.pdfPageEnd - offset],
    topics: topics.map((t) => ({ key: t.key, title: t.title, file: `topics/${t.key}.json`, passages: t.passages.length })),
    stats: { topics: topics.length, passages: all.length, images, byKind, byReason, needsReview },
  });

  const md = [`# ${chapter.number}. ${title}`, "", `Source: ${meta.title}, printed pp. ${chapter.pdfPageStart - offset}-${chapter.pdfPageEnd - offset}`, ""];
  for (const t of topics) {
    md.push(`## ${t.key} ${t.title}`, "");
    let section: string | null = null;
    for (const p of t.passages) {
      if (p.section && p.section !== section) {
        md.push(`### ${p.section}`, "");
        section = p.section;
      }
      md.push(`<!-- ${p.id} · ${p.kind} · p.${p.printedPageStart}${p.needsReview ? " · review: " + p.reviewReasons.join(",") : ""} -->`);
      if (p.caption) md.push(`**${p.caption}**`);
      if (p.image) md.push(`![${p.body.replace(/[\[\]\n]/g, " ")}](assets/${p.image})`);
      else md.push(p.body);
      md.push("");
    }
  }
  await writeFile(path.join(dir, "chapter.md"), md.join("\n"), "utf8");

  return { outDir: rel(base), topics: topics.length, passages: all.length, needsReview, images };
}

export interface KbBookSummary {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  language: string;
  /** The folder, relative to the project (what readKbChapter takes). */
  dir: string;
  /** The folder relative to kb/, e.g. "physics/class-9-10/bn"; used in the book's page address. */
  slug: string;
  chapters: { number: number; title: string; passages: number; needsReview: number }[];
}

/** What is currently in kb/, read back from the files. */
export async function readKbSummary(): Promise<KbBookSummary[]> {
  const books: KbBookSummary[] = [];
  const ls = async (dir: string) => (await readdir(dir, { withFileTypes: true }).catch(() => [])).filter((e) => e.isDirectory()).map((e) => e.name);

  // A book folder is any folder (up to three levels under kb/) that holds a textbook.json:
  // kb/<subject>/<lang>/ or kb/<subject>/class-<level>/<lang>/
  const find = async (dir: string, depth: number): Promise<void> => {
    const book = await readFile(path.join(dir, "textbook.json"), "utf8").then(JSON.parse).catch(() => null);
    if (book) {
      const chapters: KbBookSummary["chapters"] = [];
      for (const ch of await ls(path.join(dir, "chapters"))) {
        const c = await readFile(path.join(dir, "chapters", ch, "chapter.json"), "utf8").then(JSON.parse).catch(() => null);
        if (c) chapters.push({ number: c.number, title: c.title, passages: c.stats.passages, needsReview: c.stats.needsReview });
      }
      chapters.sort((x, y) => x.number - y.number);
      books.push({ id: book.id, title: book.title ?? book.id, subject: book.subject, classLevel: book.classLevel ?? "", language: book.language, dir: rel(dir), slug: path.relative(KB_OUT_DIR, dir).replaceAll("\\", "/"), chapters });
      return;
    }
    if (depth > 0) for (const name of await ls(dir)) await find(path.join(dir, name), depth - 1);
  };
  await find(KB_OUT_DIR, 3);
  return books;
}

export interface ChapterViewPassage {
  id: string;
  kind: string;
  section: string | null;
  caption: string | null;
  /** The text as it stands now: the reviewer's edit when there is one. */
  body: string;
  image: string | null;
  printedPageStart: number;
  reviewReasons: string[];
  /** Whether this passage goes to the AI, and why. */
  ai: AiDecision;
  /** A reviewer changed the text. */
  edited: boolean;
  /** A reviewer decided about this passage. */
  reviewed: "kept" | "excluded" | null;
}

export interface ChapterView {
  number: number;
  title: string;
  topics: { key: string; title: string; passages: ChapterViewPassage[] }[];
  /** What the AI-ready copy of this chapter holds. */
  ai: AiReport;
}

/** `dir` as listed by readKbSummary, resolved and checked to be inside kb/. */
export function bookDirInKb(dir: string): string | null {
  // `dir` is checked against KB_OUT_DIR on the next line, so tell Turbopack not to trace the whole project for this path
  const resolved = path.resolve(/* turbopackIgnore: true */ process.cwd(), dir);
  return resolved.startsWith(KB_OUT_DIR + path.sep) ? resolved : null;
}

type RawPassage = AiPassage & { image?: string | null };
interface LoadedChapter {
  chDir: string;
  number: number;
  title: string;
  topics: { key: string; title: string; passages: RawPassage[] }[];
  curation: Record<string, Curation>;
}

const curationFile = (chDir: string) => path.join(chDir, "curation.json");

async function readCuration(chDir: string): Promise<Record<string, Curation>> {
  return readFile(curationFile(chDir), "utf8").then((t) => JSON.parse(t) as Record<string, Curation>).catch(() => ({}));
}

/** Reviewer decisions only count while the parsed text is the text they were made against. */
const currentCuration = (curation: Record<string, Curation>, p: RawPassage) => (curation[p.id]?.original === p.body ? curation[p.id] : undefined);

async function loadChapter(dir: string, number: number): Promise<LoadedChapter | null> {
  const bookDir = bookDirInKb(dir);
  if (!bookDir || !Number.isInteger(number) || number < 1 || number > 99) return null;

  const chDir = path.join(bookDir, "chapters", pad(number));
  const chapter = await readFile(path.join(chDir, "chapter.json"), "utf8").then(JSON.parse).catch(() => null);
  if (!chapter) return null;

  const topics: LoadedChapter["topics"] = [];
  for (const t of chapter.topics as { key: string; file: string }[]) {
    // topic files are named by key; never trust a path read from JSON
    const topic = await readFile(path.join(chDir, "topics", path.basename(t.file)), "utf8").then(JSON.parse).catch(() => null);
    if (!topic) continue;
    topics.push({
      key: topic.key,
      title: topic.title,
      passages: topic.passages.map((p: RawPassage & { reviewReasons?: string[] }) => ({ ...p, reviewReasons: p.reviewReasons ?? [], section: p.section ?? null, caption: p.caption ?? null, image: p.image ?? null })),
    });
  }
  return { chDir, number: chapter.number, title: chapter.title, topics, curation: await readCuration(chDir) };
}

function viewOf(p: RawPassage, curation: Record<string, Curation>): ChapterViewPassage {
  const cur = currentCuration(curation, p);
  return {
    id: p.id,
    kind: p.kind,
    section: p.section,
    caption: p.caption,
    body: cur?.body ?? p.body,
    image: p.image ?? null,
    printedPageStart: p.printedPageStart,
    reviewReasons: p.reviewReasons,
    ai: classify(p, cur),
    edited: cur?.body !== undefined,
    reviewed: cur?.status ?? null,
  };
}

const aiInput = (c: LoadedChapter) => ({
  number: c.number,
  title: c.title,
  topics: c.topics.map((t) => ({ key: t.key, title: t.title, passages: t.passages.map((p) => ({ ...p, curation: currentCuration(c.curation, p) })) })),
});

/** The extracted content of one exported chapter, read back from its files for display. */
export async function readKbChapter(dir: string, number: number): Promise<ChapterView | null> {
  const c = await loadChapter(dir, number);
  if (!c) return null;
  return {
    number: c.number,
    title: c.title,
    topics: c.topics.map((t) => ({ key: t.key, title: t.title, passages: t.passages.map((p) => viewOf(p, c.curation)) })),
    ai: buildAiReady(aiInput(c)).report,
  };
}

/**
 * Writes the AI-ready copy of a chapter next to it: ai/passages.jsonl (what may be fed to an AI),
 * ai/exercises.jsonl (questions, kept apart) and ai/report.json. Rebuilt after every export and review change.
 */
export async function writeAiReady(dir: string, number: number): Promise<AiReport | null> {
  const c = await loadChapter(dir, number);
  if (!c) return null;
  const { records, exercises, report } = buildAiReady(aiInput(c));
  const out = path.join(c.chDir, "ai");
  await mkdir(out, { recursive: true });
  const lines = (rows: unknown[]) => rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  await writeFile(path.join(out, "passages.jsonl"), lines(records), "utf8");
  await writeFile(path.join(out, "exercises.jsonl"), lines(exercises), "utf8");
  await writeJson(path.join(out, "report.json"), report);
  return report;
}

export type CurateAction = { type: "keep" } | { type: "exclude" } | { type: "edit"; body: string } | { type: "reset" };

/** Records a reviewer's decision about one passage, then rebuilds the AI-ready files. */
export async function curatePassage(dir: string, number: number, passageId: string, action: CurateAction): Promise<{ passage: ChapterViewPassage; ai: AiReport } | { error: string }> {
  const c = await loadChapter(dir, number);
  if (!c) return { error: "Chapter not found." };
  const raw = c.topics.flatMap((t) => t.passages).find((p) => p.id === passageId);
  if (!raw) return { error: "Passage not found." };

  if (action.type === "reset") delete c.curation[raw.id];
  else if (action.type === "keep") c.curation[raw.id] = { status: "kept", original: raw.body };
  else if (action.type === "exclude") c.curation[raw.id] = { status: "excluded", original: raw.body };
  else {
    const body = action.body.replace(/\r/g, "").trim();
    if (!body || body.length > 20000) return { error: "The text must be between 1 and 20,000 characters." };
    // Saving the text unchanged is the same as keeping it
    c.curation[raw.id] = body === raw.body ? { status: "kept", original: raw.body } : { status: "kept", body, original: raw.body };
  }
  await writeJson(curationFile(c.chDir), c.curation);
  const ai = (await writeAiReady(dir, number)) ?? buildAiReady(aiInput(c)).report;
  return { passage: viewOf(raw, c.curation), ai };
}

const IMAGE_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

/** One picture of an exported chapter, or null when the request doesn't name a real file under kb/. */
export async function readKbAsset(dir: string, number: number, file: string): Promise<{ data: Buffer; type: string } | null> {
  const bookDir = bookDirInKb(dir);
  const type = IMAGE_TYPES[path.extname(file).toLowerCase()];
  if (!bookDir || !type || !/^[\w.\-]+$/.test(file) || !Number.isInteger(number) || number < 1 || number > 99) return null;
  const data = await readFile(path.join(bookDir, "chapters", pad(number), "assets", file)).catch(() => null);
  return data ? { data, type } : null;
}

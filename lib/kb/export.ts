import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { KbJob, JobResult } from "./jobs";
import type { ChapterDraft } from "./mdtree";
import { bookOutDir } from "./paths";
import { applyCorrections, CORRECTIONS, reviewReasons } from "./review";

const pad = (n: number) => String(n).padStart(2, "0");
const writeJson = (file: string, value: unknown) => writeFile(file, JSON.stringify(value, null, 2), "utf8");

/**
 * Writes the chapters into the KB folder layout:
 *   kb/<subject>/class-<level>/<lang>/textbook.json
 *   kb/<subject>/class-<level>/<lang>/chapters/NN/chapter.json | chapter.md | topics/<key>.json
 * Chapters already exported for the same book are replaced only when they are in `chapters`,
 * so a book can be processed in several page ranges.
 */
export async function exportChapters(job: KbJob, chapters: ChapterDraft[]): Promise<JobResult> {
  const { meta } = job;
  const base = bookOutDir(meta.subject, meta.classLevel, meta.language);
  const bookId = [meta.subject, meta.classLevel, meta.language].filter(Boolean).join("-");
  const offset = meta.printedPageOffset;
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
    extraction: {
      method: "llamaparse",
      tier: job.tier,
      parseJobId: job.parseJobId,
      output: "markdown",
      corrections: CORRECTIONS.map((c) => `${c.name} -> ${c.to}`),
    },
  });

  const summary: JobResult["chapters"] = [];
  for (const chapter of chapters) {
    const dir = path.join(base, "chapters", pad(chapter.number));
    await rm(dir, { recursive: true, force: true });
    await mkdir(path.join(dir, "topics"), { recursive: true });

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
      stats: { topics: topics.length, passages: all.length, byKind, byReason, needsReview },
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
        md.push(p.body, "");
      }
    }
    await writeFile(path.join(dir, "chapter.md"), md.join("\n"), "utf8");

    summary.push({ number: chapter.number, title, topics: topics.length, passages: all.length, needsReview });
  }
  return { outDir: path.relative(process.cwd(), base).replaceAll("\\", "/"), chapters: summary };
}

export interface KbBookSummary {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  language: string;
  dir: string;
  chapters: { number: number; title: string; passages: number; needsReview: number }[];
}

/** What is currently in kb/, read back from the files. */
export async function readKbSummary(): Promise<KbBookSummary[]> {
  const { readdir } = await import("node:fs/promises");
  const { KB_OUT_DIR } = await import("./paths");
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
      books.push({ id: book.id, title: book.title ?? book.id, subject: book.subject, classLevel: book.classLevel ?? "", language: book.language, dir: path.relative(process.cwd(), dir).replaceAll("\\", "/"), chapters });
      return;
    }
    if (depth > 0) for (const name of await ls(dir)) await find(path.join(dir, name), depth - 1);
  };
  await find(KB_OUT_DIR, 3);
  return books;
}

import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import LlamaCloud from "@llamaindex/llama-cloud";

import { exportChapter } from "./export";
import { attachImages, type ParsedImage } from "./images";
import { cutPath, getJob, pagesPath, updateChapter, updateJob, uploadPath, type ChapterPlan, type KbJob } from "./jobs";
import { buildBookTree, type PageMarkdown } from "./mdtree";
import { detectClassLevel, detectEditionYear, detectLanguage } from "./meta";
import { KB_UPLOADS_DIR } from "./paths";
import { cutPages } from "./pdf";
import { planChapters } from "./plan";

/**
 * The processing steps behind the dashboard. Nothing here waits for the parser (a chapter takes about
 * a minute, a whole book far longer): a step hands pages to the parser and returns, and the page
 * polls `advanceJob`, which checks on whatever is running and moves it on.
 *
 *  1. startPlan:    parse the first pages (the contents) -> chapter names and page ranges
 *  2. startChapter: cut one chapter out of the PDF, parse it (with its pictures)
 *  3. advanceJob:   when a parse finishes, structure it and write the chapter into kb/
 */

const PLAN_PAGES = 15;
const MAX_PARALLEL = 2;
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 500);

function client() {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) throw new Error("LLAMA_CLOUD_API_KEY is not set. Add it to .env.local and restart the server.");
  // Uploading a chapter PDF can take longer than the SDK's one-minute default
  return new LlamaCloud({ apiKey, timeout: 10 * 60 * 1000 });
}

const langsFor = (language: KbJob["meta"]["language"]): ("bn" | "en")[] => (language === "en" ? ["en"] : ["bn", "en"]);

/** Cuts pages out of the book, sends them to the parser and returns its job id. The cut file is removed afterwards. */
async function submit(job: KbJob, part: "plan" | number, from: number, to: number, withImages: boolean) {
  await mkdir(KB_UPLOADS_DIR, { recursive: true });
  const file = cutPath(job.id, part);
  try {
    await cutPages(uploadPath(job.id), from, to, file);
    const created = await client().parsing.create({
      tier: job.tier as "agentic",
      version: "latest",
      upload_file: createReadStream(file),
      processing_options: { ocr_parameters: { languages: langsFor(job.meta.language) } },
      ...(withImages ? { output_options: { images_to_save: ["layout" as const, "embedded" as const] } } : {}),
    });
    return created.id;
  } finally {
    await rm(file, { force: true });
  }
}

/** Reads the contents pages to find the chapters. Runs automatically after upload; it is only a few pages. */
export async function startPlan(jobId: string) {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  try {
    const planJobId = await submit(job, "plan", 1, Math.min(PLAN_PAGES, job.pageCount), false);
    return await updateJob(job.id, { status: "planning", planJobId, error: null });
  } catch (err) {
    return updateJob(job.id, { status: "failed", error: errorMessage(err) });
  }
}

/** Parses one chapter (cut out of the PDF) and records the parser's job id. This is the step that uses credits. */
export async function startChapter(jobId: string, number: number) {
  const job = await getJob(jobId);
  const chapter = job?.chapters.find((c) => c.number === number);
  if (!job || !chapter) throw new Error("Chapter not found");
  if (chapter.status === "parsing") return job;
  try {
    const parseJobId = await submit(job, number, chapter.pageFrom, chapter.pageTo, true);
    return await updateChapter(job.id, number, { status: "parsing", parseJobId, error: null, result: null, creditsUsed: null });
  } catch (err) {
    return updateChapter(job.id, number, { status: "failed", error: errorMessage(err) });
  }
}

const inFlight = new Map<string, Promise<KbJob | null>>();

/** Checks on everything running for this job and moves it on. Safe to call repeatedly. */
export function advanceJob(jobId: string): Promise<KbJob | null> {
  const running = inFlight.get(jobId);
  if (running) return running;
  const p = advance(jobId).finally(() => inFlight.delete(jobId));
  inFlight.set(jobId, p);
  return p;
}

async function advance(jobId: string): Promise<KbJob | null> {
  let job = await getJob(jobId);
  if (!job) return null;

  if (job.status === "planning") job = (await finishPlan(job)) ?? job;
  for (const chapter of job.chapters.filter((c) => c.status === "parsing")) job = (await finishChapter(job, chapter)) ?? job;

  // "Parse all": keep a couple of chapters going until none are left
  if (job.autoRun) {
    const pending = job.chapters.filter((c) => c.status === "pending");
    let running = job.chapters.filter((c) => c.status === "parsing").length;
    for (const c of pending) {
      if (running >= MAX_PARALLEL) break;
      job = await startChapter(job.id, c.number);
      running += 1;
    }
    if (!job.chapters.some((c) => c.status === "pending" || c.status === "parsing")) job = await updateJob(job.id, { autoRun: false });
  }
  return job;
}

type RawPage = { page_number: number; markdown?: string; success?: boolean };

async function finishPlan(job: KbJob): Promise<KbJob | null> {
  if (!job.planJobId) return null;
  try {
    const api = client();
    const state = await api.parsing.get(job.planJobId);
    const status = state.job.status;
    if (status === "PENDING" || status === "RUNNING") return null;
    if (status !== "COMPLETED") return await updateJob(job.id, { status: "failed", error: state.job.error_message || `Reading the contents ended with status ${status}.` });

    const full = await api.parsing.get(job.planJobId, { expand: ["markdown"] });
    const pages: PageMarkdown[] = ((full.markdown?.pages ?? []) as RawPage[])
      .filter((p) => p.success !== false && typeof p.markdown === "string")
      .map((p) => ({ number: p.page_number, markdown: p.markdown! }));
    await writeFile(pagesPath(job.id, "plan"), JSON.stringify({ pages }), "utf8");

    const plan = planChapters(pages, job.pageCount);
    if (!plan.ok) return await updateJob(job.id, { status: "failed", error: plan.error });

    // What the file name doesn't say is read from the front pages: the cover prints the class and edition
    const text = pages.map((p) => p.markdown).join("\n");
    const language = job.meta.language === "auto" ? detectLanguage(text) : job.meta.language;
    const classLevel = job.meta.classLevel || detectClassLevel(text);
    const editionYear = job.meta.editionYear ?? detectEditionYear(text);
    const chapters: ChapterPlan[] = plan.chapters.map((c) => ({ ...c, status: "pending", parseJobId: null, creditsUsed: null, error: null, result: null }));
    return await updateJob(job.id, { status: "planned", chapters, meta: { ...job.meta, language, classLevel, editionYear, printedPageOffset: plan.printedPageOffset }, error: null });
  } catch (err) {
    return await updateJob(job.id, { status: "failed", error: errorMessage(err) });
  }
}

async function finishChapter(job: KbJob, chapter: ChapterPlan): Promise<KbJob | null> {
  if (!chapter.parseJobId) return null;
  try {
    const api = client();
    const state = await api.parsing.get(chapter.parseJobId);
    const status = state.job.status;
    if (status === "PENDING" || status === "RUNNING") return null;
    if (status !== "COMPLETED") {
      return await updateChapter(job.id, chapter.number, { status: "failed", error: state.job.error_message || `The parser ended with status ${status}.` });
    }

    const full = await api.parsing.get(chapter.parseJobId, { expand: ["markdown", "images_content_metadata", "usage"] });
    const raw = ((full.markdown?.pages ?? []) as RawPage[]).filter((p) => p.success !== false && typeof p.markdown === "string");
    if (!raw.length) return await updateChapter(job.id, chapter.number, { status: "failed", error: "The parser returned no pages." });

    // The chapter was cut out of the book, so the parser numbers its pages from 1
    const pages: PageMarkdown[] = raw.map((p) => ({ number: chapter.pageFrom + p.page_number - 1, markdown: p.markdown! })).sort((a, b) => a.number - b.number);
    const images: ParsedImage[] = (full.images_content_metadata?.images ?? [])
      .filter((i) => !!i.presigned_url)
      .map((i) => ({ filename: i.filename, category: (i.category ?? null) as ParsedImage["category"], bbox: i.bbox ?? null, url: i.presigned_url! }));
    await writeFile(pagesPath(job.id, chapter.number), JSON.stringify({ pages, images }), "utf8");

    const credits = full.job.usage?.credits ?? null;
    return await structureChapter(job.id, chapter.number, credits);
  } catch (err) {
    return await updateChapter(job.id, chapter.number, { status: "failed", error: errorMessage(err) });
  }
}

/** Builds the chapter from its saved parser output and writes it to kb/. Costs nothing, so it can be re-run. */
export async function structureChapter(jobId: string, number: number, credits?: number | null): Promise<KbJob> {
  const job = await getJob(jobId);
  const plan = job?.chapters.find((c) => c.number === number);
  if (!job || !plan) throw new Error("Chapter not found");
  try {
    const saved = JSON.parse(await readFile(pagesPath(job.id, number), "utf8")) as { pages: PageMarkdown[]; images?: ParsedImage[] };
    const found = buildBookTree(saved.pages);
    const draft = found.find((c) => c.number === number) ?? (found.length === 1 ? found[0] : undefined);
    if (!draft) {
      return await updateChapter(job.id, number, { status: "failed", error: "No chapter heading was found in these pages. Check the chapter's page range." });
    }
    // The contents page's name for the chapter is clean; the parsed heading is the fallback
    if (!draft.title) draft.title = plan.title;
    const placed = attachImages(draft, saved.images ?? [], plan.pageFrom);
    const result = await exportChapter(job, draft, placed);
    await updateJob(job.id, { outDir: result.outDir });
    return await updateChapter(job.id, number, {
      status: "done",
      error: null,
      title: draft.title,
      result: { topics: result.topics, passages: result.passages, needsReview: result.needsReview, images: result.images },
      ...(credits !== undefined ? { creditsUsed: credits } : {}),
    });
  } catch (err) {
    return await updateChapter(job.id, number, { status: "failed", error: errorMessage(err) });
  }
}

/** Turns on "parse every chapter" and starts the first ones. */
export async function startAll(jobId: string) {
  await updateJob(jobId, { autoRun: true });
  return advanceJob(jobId);
}

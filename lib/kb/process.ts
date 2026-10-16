import "server-only";

import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import LlamaCloud from "@llamaindex/llama-cloud";

import { exportChapters } from "./export";
import { getJob, pagesPath, updateJob, uploadPath, type KbJob } from "./jobs";
import { buildBookTree, type PageMarkdown } from "./mdtree";
import { detectLanguage } from "./meta";

/**
 * The processing steps behind the dashboard buttons. Parsing a whole book takes minutes, so nothing
 * here waits for it: `startParse` hands the PDF to the parser and returns; the page polls
 * `advanceJob`, which checks on the parser and, once it has finished, structures the pages and
 * writes the chapters into kb/.
 */

function client() {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) throw new Error("LLAMA_CLOUD_API_KEY is not set. Add it to .env.local and restart the server.");
  return new LlamaCloud({ apiKey });
}

const langsFor = (language: KbJob["meta"]["language"]): ("bn" | "en")[] => (language === "en" ? ["en"] : ["bn", "en"]);

/** Sends the PDF (the chosen page range) to the parser and records its job id. */
export async function startParse(jobId: string) {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  if (job.status === "parsing") return job;

  try {
    const created = await client().parsing.create({
      tier: job.tier as "agentic",
      version: "latest",
      upload_file: createReadStream(uploadPath(job.id)),
      processing_options: { ocr_parameters: { languages: langsFor(job.meta.language) } },
      page_ranges: { target_pages: `${job.pageFrom}-${job.pageTo}` },
    });
    return await updateJob(job.id, { status: "parsing", parseJobId: created.id, error: null, result: null, creditsUsed: null });
  } catch (err) {
    return updateJob(job.id, { status: "failed", error: errorMessage(err) });
  }
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 500);

/** Parser page numbers are either 1..n for the cut range or the PDF's own numbers; return PDF page numbers. */
function toPdfPages(numbers: number[], pageFrom: number, pageTo: number) {
  const count = pageTo - pageFrom + 1;
  const relative = Math.min(...numbers) === 1 && Math.max(...numbers) <= count && pageFrom > 1;
  return (n: number) => (relative ? pageFrom + n - 1 : n);
}

const inFlight = new Map<string, Promise<KbJob | null>>();

/** Checks on the parser; when it has finished, saves the pages and writes the chapters. Safe to call repeatedly. */
export function advanceJob(jobId: string): Promise<KbJob | null> {
  const running = inFlight.get(jobId);
  if (running) return running;
  const p = advance(jobId).finally(() => inFlight.delete(jobId));
  inFlight.set(jobId, p);
  return p;
}

async function advance(jobId: string): Promise<KbJob | null> {
  const job = await getJob(jobId);
  if (!job || job.status !== "parsing" || !job.parseJobId) return job;

  try {
    const api = client();
    const state = await api.parsing.get(job.parseJobId);
    const status = state.job.status;
    if (status === "PENDING" || status === "RUNNING") return job;
    if (status !== "COMPLETED") {
      return await updateJob(job.id, { status: "failed", error: state.job.error_message || `The parser ended with status ${status}.` });
    }

    const full = await api.parsing.get(job.parseJobId, { expand: ["markdown", "usage"] });
    const raw = (full.markdown?.pages ?? []) as { page_number: number; markdown?: string; success?: boolean }[];
    const parsed = raw.filter((p) => p.success !== false && typeof p.markdown === "string");
    if (!parsed.length) return await updateJob(job.id, { status: "failed", error: "The parser returned no pages." });

    const pdfPage = toPdfPages(parsed.map((p) => p.page_number), job.pageFrom, job.pageTo);
    const pages: PageMarkdown[] = parsed.map((p) => ({ number: pdfPage(p.page_number), markdown: p.markdown! })).sort((a, b) => a.number - b.number);
    await writeFile(pagesPath(job.id), JSON.stringify({ pages }), "utf8");

    const credits = (full as { usage?: { credits?: number | null } }).usage?.credits ?? null;
    return await structureJob(job.id, credits);
  } catch (err) {
    return updateJob(job.id, { status: "failed", error: errorMessage(err) });
  }
}

/** Builds the chapters from the saved pages and writes them to kb/. Costs nothing, so it can be re-run. */
export async function structureJob(jobId: string, credits?: number | null): Promise<KbJob> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  try {
    const { pages } = JSON.parse(await readFile(pagesPath(job.id), "utf8")) as { pages: PageMarkdown[] };
    // An unknown language is decided from what the parser actually read
    const language = job.meta.language === "auto" ? detectLanguage(pages.map((p) => p.markdown).join("\n")) : job.meta.language;
    const ready = job.meta.language === "auto" ? await updateJob(job.id, { meta: { ...job.meta, language } }) : job;
    const chapters = buildBookTree(pages);
    if (!chapters.length) {
      return await updateJob(job.id, { status: "failed", error: "No chapters were found in these pages. Check the page range and that the book's chapter headings are in the pages." });
    }
    const result = await exportChapters(ready, chapters);
    return await updateJob(job.id, { status: "done", error: null, result, ...(credits !== undefined ? { creditsUsed: credits } : {}) });
  } catch (err) {
    return updateJob(job.id, { status: "failed", error: errorMessage(err) });
  }
}

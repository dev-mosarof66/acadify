import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, desc, eq, inArray } from "drizzle-orm";

import { aiJobs, db, lectureSheets, questionBankItems } from "@/lib/db";
import { signedUrl } from "@/lib/files/storage";
import { claude, costBdt } from "./claude";
import { checkPaper, LANGUAGES, PaperSchema, totalMarks, type PaperParams } from "./paper";

export const PAPER_PROMPT_VERSION = "paper-v1";

const SYSTEM = `You write exam question papers for schools and madrasas in Bangladesh, the way an experienced subject teacher would.

Follow the board pattern used for SSC, Dakhil and school exams:
- Creative questions (srijonshil, CQ): each has a stimulus (a short passage, scenario, data table or described diagram) and exactly four parts in this order: ka (knowledge, 1 mark), kha (comprehension, 2 marks), ga (application, 3 marks), gha (higher-order thinking, 4 marks). Parts must depend on the stimulus; ga and gha must require applying or analysing it, not recall.
- MCQs: one clearly correct option and three plausible distractors. No "all of the above" or "none of the above". Do not prefix options with letters.

Rules:
- Base every question on the source material and chapters given. Stay within the syllabus level of the class. Never use facts you are unsure of; if the material is thin, keep questions to what it supports.
- Spread questions across the chapters given, and match the requested difficulty mix.
- Do not repeat questions from the institute's existing question bank word for word.
- Write the whole paper in the requested language. For Bangla, use standard Bangla script and Bangla terms as used in NCTB textbooks; keep scientific symbols and formulas as they are.
- Each answer guide lists the points a full-mark answer must contain, briefly, for the teacher.`;

/** The lecture sheets the teacher picked, as content blocks Claude can read (PDFs and images; other files are skipped). */
async function sheetBlocks(instituteId: string, sheetIds: string[]) {
  if (!sheetIds.length) return { blocks: [] as Anthropic.Beta.BetaContentBlockParam[], skipped: [] as string[] };
  const rows = await db
    .select({ id: lectureSheets.id, title: lectureSheets.title, key: lectureSheets.fileKey, contentType: lectureSheets.contentType })
    .from(lectureSheets)
    .where(and(eq(lectureSheets.instituteId, instituteId), inArray(lectureSheets.id, sheetIds)));

  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    const image = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(row.contentType);
    if (row.contentType !== "application/pdf" && !image) {
      skipped.push(`${row.title} (only PDF and image sheets can be read)`);
      continue;
    }
    const res = await fetch(await signedUrl(row.key));
    if (!res.ok) {
      skipped.push(`${row.title} (couldn't be downloaded)`);
      continue;
    }
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    blocks.push({ type: "text", text: `Lecture sheet: ${row.title}` });
    blocks.push(
      image
        ? { type: "image", source: { type: "base64", media_type: row.contentType as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data } }
        : { type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: row.title }
    );
  }
  return { blocks, skipped };
}

/** Recent bank questions for the subject, so the new paper doesn't repeat them. */
async function bankQuestions(instituteId: string, subjectId: string) {
  const rows = await db
    .select({ type: questionBankItems.type, body: questionBankItems.body })
    .from(questionBankItems)
    .where(and(eq(questionBankItems.instituteId, instituteId), eq(questionBankItems.subjectId, subjectId)))
    .orderBy(desc(questionBankItems.createdAt))
    .limit(80);
  return rows.map((r) => {
    const body = r.body as { question?: string; stimulus?: string };
    return `- ${r.type.toUpperCase()}: ${(body.question ?? body.stimulus ?? "").slice(0, 200)}`;
  });
}

function request(p: PaperParams) {
  return `Write a question paper.

Class: ${p.className}
Subject: ${p.subjectName}
Exam: ${p.examName}
Chapters / topics: ${p.chapters}
Language: ${LANGUAGES[p.language]}
Difficulty: ${p.difficulty === "balanced" ? "a balanced mix of easy, medium and hard" : p.difficulty === "easy" ? "mostly easy, some medium" : "mostly hard, some medium"}
Creative questions: write exactly ${p.cqCount} (students will answer ${p.cqToAnswer})
MCQs: write exactly ${p.mcqCount}
Total marks: ${totalMarks(p)}, time ${p.minutes} minutes
${p.notes ? `Teacher's notes: ${p.notes}` : ""}`.trim();
}

/** Generates the paper for a queued job and leaves it awaiting a teacher's approval. Never throws. */
export async function runPaperJob(jobId: string) {
  const [job] = await db.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1);
  if (!job || job.status !== "queued") return;
  await db.update(aiJobs).set({ status: "running" }).where(eq(aiJobs.id, jobId));
  const params = job.params as PaperParams;

  try {
    const [{ blocks, skipped }, bank] = await Promise.all([sheetBlocks(job.instituteId, job.sourceSheetIds), bankQuestions(job.instituteId, params.subjectId)]);
    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      ...blocks,
      ...(bank.length ? [{ type: "text" as const, text: `Questions already in the institute's bank (don't repeat):\n${bank.join("\n")}` }] : []),
      { type: "text", text: request(params) },
    ];

    // Streamed, so a full 100-mark Bangla paper has room to finish without an HTTP timeout
    const response = await claude()
      .beta.messages.stream({
        model: job.model,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { format: betaZodOutputFormat(PaperSchema), effort: "medium" },
        system: SYSTEM,
        messages: [{ role: "user", content }],
      })
      .finalMessage();

    const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, costBdt: costBdt(response.model, response.usage), model: response.model };
    // Record the spend even when the answer can't be used
    await db.update(aiJobs).set(usage).where(eq(aiJobs.id, jobId));
    if (response.stop_reason === "refusal") throw new Error("The AI declined to write this paper. Try rewording the chapters or notes.");
    if (response.stop_reason === "max_tokens") throw new Error("The paper was too long to finish. Ask for fewer questions.");

    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // handled below
    }
    const parsed = PaperSchema.safeParse(json);
    if (!parsed.success) throw new Error("The AI's answer couldn't be read as a question paper. Please try again.");
    const paper = parsed.data;

    const warnings = [...checkPaper(paper, params), ...skipped.map((s) => `Not used as source: ${s}`)];
    await db.update(aiJobs).set({ status: "awaiting_approval", output: paper, warnings, error: null }).where(eq(aiJobs.id, jobId));
  } catch (err) {
    console.error("[exam-studio] job failed", jobId, err);
    const message =
      err instanceof Anthropic.RateLimitError
        ? "The AI service is busy. Please try again in a minute."
        : err instanceof Anthropic.APIError
          ? "The AI service didn't respond. Please try again in a minute."
          : err instanceof Error
            ? err.message
            : "Something went wrong.";
    await db.update(aiJobs).set({ status: "failed", error: message }).where(eq(aiJobs.id, jobId));
  }
}

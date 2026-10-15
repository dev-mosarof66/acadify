"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertInstituteMember } from "@/lib/auth/session";
import { aiApprovals, aiJobs, classes, db, lectureSheets, questionBankItems, subjects } from "@/lib/db";
import { marksAllSections } from "@/lib/institute/attendance-queries";
import { aiConfigured, GENERATION_MODEL, getAiCredit } from "./claude";
import { PAPER_PROMPT_VERSION, runPaperJob } from "./exam-studio";
import { checkPaper, CQ_MARKS, DIFFICULTIES, LANGUAGES, PaperSchema, type Difficulty, type Paper, type PaperLanguage, type PaperParams } from "./paper";

export type AiResult = { ok: true; id?: string; message?: string } | { ok: false; error: string; field?: string };

const NO_PERMISSION: AiResult = { ok: false, error: "Your role can't use the Exam Studio." };
const NOT_SET_UP: AiResult = { ok: false, error: "AI isn't set up for Acadify yet. Ask the Acadify team to add the AI key." };
const isId = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
const field = (form: FormData, k: string, max = 120) => String(form.get(k) ?? "").trim().slice(0, max);
const int = (form: FormData, k: string) => Number(toAsciiDigits(field(form, k)));

function refresh() {
  revalidatePath("/dashboard/exam-studio", "layout");
}

async function creditCheck(instituteId: string): Promise<AiResult | null> {
  const credit = await getAiCredit(instituteId);
  if (credit.left !== null && credit.left <= 0) return { ok: false, error: `This month's AI credit (৳${credit.cap}) is used up. It resets on the 1st, or your plan can be upgraded.` };
  return null;
}

/** Queues a question paper and starts writing it in the background. */
export async function createPaperJob(form: FormData): Promise<AiResult> {
  const me = await assertInstituteMember("exams:write");
  if (!me) return NO_PERMISSION;
  if (!aiConfigured()) return NOT_SET_UP;
  const instituteId = me.active.instituteId;

  const subjectId = field(form, "subjectId");
  const examName = field(form, "examName", 80);
  const chapters = field(form, "chapters", 1500);
  const notes = field(form, "notes", 1000);
  const cqCount = int(form, "cqCount");
  const cqToAnswer = int(form, "cqToAnswer");
  const mcqCount = int(form, "mcqCount");
  const minutes = int(form, "minutes");
  const sets = int(form, "sets");
  const language = field(form, "language") as PaperLanguage;
  const difficulty = field(form, "difficulty") as Difficulty;
  const sheetIds = form.getAll("sheetIds").map(String).filter(isId).slice(0, 5);

  if (!isId(subjectId)) return { ok: false, error: "Choose the subject.", field: "subjectId" };
  if (!examName) return { ok: false, error: "Enter the exam name, e.g. Half-yearly 2026.", field: "examName" };
  if (!chapters) return { ok: false, error: "List the chapters or topics the paper covers.", field: "chapters" };
  if (!Number.isInteger(cqCount) || cqCount < 0 || cqCount > 12) return { ok: false, error: "Creative questions must be between 0 and 12.", field: "cqCount" };
  if (!Number.isInteger(cqToAnswer) || cqToAnswer < 0 || cqToAnswer > cqCount) return { ok: false, error: "Students can't answer more creative questions than the paper has.", field: "cqToAnswer" };
  if (!Number.isInteger(mcqCount) || mcqCount < 0 || mcqCount > 60) return { ok: false, error: "MCQs must be between 0 and 60.", field: "mcqCount" };
  if (cqCount + mcqCount === 0) return { ok: false, error: "Ask for at least one question.", field: "cqCount" };
  if (!Number.isInteger(minutes) || minutes < 10 || minutes > 300) return { ok: false, error: "Time must be between 10 and 300 minutes.", field: "minutes" };
  if (!Number.isInteger(sets) || sets < 1 || sets > 4) return { ok: false, error: "Choose 1 to 4 sets.", field: "sets" };
  if (!(language in LANGUAGES)) return { ok: false, error: "Choose the paper's language.", field: "language" };
  if (!(difficulty in DIFFICULTIES)) return { ok: false, error: "Choose the difficulty.", field: "difficulty" };

  const [subject] = await db
    .select({ id: subjects.id, name: subjects.name, classId: classes.id, className: classes.name })
    .from(subjects)
    .innerJoin(classes, eq(subjects.classId, classes.id))
    .where(and(eq(subjects.id, subjectId), eq(subjects.instituteId, instituteId)))
    .limit(1);
  if (!subject) return { ok: false, error: "This subject no longer exists.", field: "subjectId" };

  // Only this institute's sheets for the same class
  const sheets = sheetIds.length
    ? await db
        .select({ id: lectureSheets.id, classId: lectureSheets.classId })
        .from(lectureSheets)
        .where(and(eq(lectureSheets.instituteId, instituteId), eq(lectureSheets.classId, subject.classId)))
    : [];
  const sourceSheetIds = sheetIds.filter((id) => sheets.some((s) => s.id === id));

  const blocked = await creditCheck(instituteId);
  if (blocked) return blocked;

  const params: PaperParams = {
    classId: subject.classId,
    className: subject.className,
    subjectId: subject.id,
    subjectName: subject.name,
    examName,
    chapters,
    cqCount,
    cqToAnswer,
    mcqCount,
    minutes,
    language,
    difficulty,
    sets,
    notes,
  };
  const [job] = await db
    .insert(aiJobs)
    .values({
      instituteId,
      kind: "question_paper",
      title: `${subject.className} · ${subject.name} · ${examName}`,
      params,
      sourceSheetIds,
      model: GENERATION_MODEL,
      promptVersion: PAPER_PROMPT_VERSION,
      requestedBy: me.id,
      requestedByName: me.name,
    })
    .returning({ id: aiJobs.id });

  after(() => runPaperJob(job.id));
  refresh();
  return { ok: true, id: job.id };
}

/** Writes a failed or rejected paper again with the same choices. */
export async function retryPaperJob(jobId: string): Promise<AiResult> {
  const me = await assertInstituteMember("exams:write");
  if (!me) return NO_PERMISSION;
  if (!aiConfigured()) return NOT_SET_UP;
  const blocked = await creditCheck(me.active.instituteId);
  if (blocked) return blocked;
  const [job] = await db
    .update(aiJobs)
    .set({ status: "queued", error: null })
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.instituteId, me.active.instituteId), eq(aiJobs.status, "failed")))
    .returning({ id: aiJobs.id });
  if (!job) return { ok: false, error: "Only a paper that failed can be tried again." };
  after(() => runPaperJob(job.id));
  refresh();
  return { ok: true };
}

/** Who may approve or reject: the teacher who asked for it, or the principal / institute admin. */
async function decidable(jobId: string) {
  const me = await assertInstituteMember("exams:write");
  if (!me || !isId(jobId)) return null;
  const [job] = await db
    .select({ id: aiJobs.id, status: aiJobs.status, params: aiJobs.params, requestedBy: aiJobs.requestedBy, output: aiJobs.output })
    .from(aiJobs)
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.instituteId, me.active.instituteId)))
    .limit(1);
  if (!job || (job.requestedBy !== me.id && !marksAllSections(me.active.role))) return null;
  return { me, job };
}

/** Approves the paper, with the teacher's edits, and adds its questions to the question bank. */
export async function approvePaper(jobId: string, paper: Paper): Promise<AiResult> {
  const found = await decidable(jobId);
  if (!found) return { ok: false, error: "Only the teacher who made this paper, or the principal, can approve it." };
  const { me, job } = found;
  if (job.status !== "awaiting_approval") return { ok: false, error: "This paper isn't waiting for approval." };

  const parsed = PaperSchema.safeParse(paper);
  if (!parsed.success) return { ok: false, error: "The paper has missing fields. Check every question has text." };
  const clean = parsed.data;
  const params = job.params as PaperParams;
  const problems = checkPaper(clean, { cqCount: clean.cq.length, mcqCount: clean.mcq.length });
  if (problems.length) return { ok: false, error: problems[0] };

  const edited = JSON.stringify(clean) !== JSON.stringify(job.output);
  const instituteId = me.active.instituteId;
  await db.insert(aiApprovals).values({ instituteId, jobId, decision: edited ? "edited" : "approved", finalOutput: clean, decidedBy: me.id, decidedByName: me.name });
  await db.update(aiJobs).set({ status: "approved" }).where(eq(aiJobs.id, jobId));

  const common = { instituteId, classId: params.classId, subjectId: params.subjectId, language: params.language, source: "ai_approved" as const, jobId, createdBy: me.id };
  const items = [
    ...clean.cq.map((q) => ({ ...common, chapter: q.chapter, type: "cq" as const, body: q, marks: CQ_MARKS })),
    ...clean.mcq.map((q) => ({ ...common, chapter: q.chapter, type: "mcq" as const, body: q, marks: 1 })),
  ];
  if (items.length) await db.insert(questionBankItems).values(items);
  refresh();
  return { ok: true, message: `Approved. ${items.length} questions added to your question bank.` };
}

export async function rejectPaper(jobId: string, note: string): Promise<AiResult> {
  const found = await decidable(jobId);
  if (!found) return { ok: false, error: "Only the teacher who made this paper, or the principal, can reject it." };
  const { me, job } = found;
  if (job.status !== "awaiting_approval") return { ok: false, error: "This paper isn't waiting for approval." };
  await db.insert(aiApprovals).values({ instituteId: me.active.instituteId, jobId, decision: "rejected", note: note.trim().slice(0, 500), decidedBy: me.id, decidedByName: me.name });
  await db.update(aiJobs).set({ status: "rejected" }).where(eq(aiJobs.id, jobId));
  refresh();
  return { ok: true };
}

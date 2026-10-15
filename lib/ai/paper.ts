import { z } from "zod";

/*
 * The question paper format the AI Exam Studio produces and teachers edit. Safe to import anywhere.
 * Board pattern: each creative question (CQ) has a stimulus and four parts, ka (knowledge, 1),
 * kha (comprehension, 2), ga (application, 3) and gha (higher-order, 4), for 10 marks; each MCQ is 1 mark.
 */

export const CQ_PARTS = [
  { key: "ka", bn: "ক", level: "Knowledge", marks: 1 },
  { key: "kha", bn: "খ", level: "Comprehension", marks: 2 },
  { key: "ga", bn: "গ", level: "Application", marks: 3 },
  { key: "gha", bn: "ঘ", level: "Higher-order", marks: 4 },
] as const;
export const CQ_MARKS = 10;

/** Sets of the same paper with the MCQs reordered, so neighbours can't copy. */
export const SET_NAMES = [
  { en: "Ka", bn: "ক" },
  { en: "Kha", bn: "খ" },
  { en: "Ga", bn: "গ" },
  { en: "Gha", bn: "ঘ" },
] as const;

export const LANGUAGES = { bn: "Bangla", en: "English" } as const;
export type PaperLanguage = keyof typeof LANGUAGES;

export const DIFFICULTIES = { easy: "Mostly easy", balanced: "Balanced", hard: "Mostly hard" } as const;
export type Difficulty = keyof typeof DIFFICULTIES;

export const PaperSchema = z.object({
  cq: z.array(
    z.object({
      chapter: z.string().describe("Chapter or topic this question comes from"),
      stimulus: z.string().describe("The passage, scenario, diagram description or data the parts refer to"),
      parts: z
        .array(
          z.object({
            question: z.string(),
            answerGuide: z.string().describe("Short marking guide: the points a full-mark answer must contain"),
          })
        )
        .describe("Exactly four parts in order: ka (knowledge), kha (comprehension), ga (application), gha (higher-order)"),
    })
  ),
  mcq: z.array(
    z.object({
      chapter: z.string(),
      question: z.string(),
      options: z.array(z.string()).describe("Exactly four options, without a/b/c/d or ক/খ/গ/ঘ prefixes"),
      correctIndex: z.number().int().describe("0-based index of the one correct option"),
      explanation: z.string().describe("One sentence on why the answer is correct"),
    })
  ),
});
export type Paper = z.infer<typeof PaperSchema>;
export type CqQuestion = Paper["cq"][number];
export type McqQuestion = Paper["mcq"][number];

/** What the teacher asked for. Stored on the job. */
export interface PaperParams {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  examName: string;
  chapters: string;
  cqCount: number;
  /** How many CQs students answer; the rest are choices. */
  cqToAnswer: number;
  mcqCount: number;
  minutes: number;
  language: PaperLanguage;
  difficulty: Difficulty;
  sets: number;
  notes: string;
}

export const totalMarks = (p: Pick<PaperParams, "cqToAnswer" | "mcqCount">) => p.cqToAnswer * CQ_MARKS + p.mcqCount;

/** Problems a teacher must see before approving. Empty when the paper matches what was asked. */
export function checkPaper(paper: Paper, params: Pick<PaperParams, "cqCount" | "mcqCount">): string[] {
  const warnings: string[] = [];
  if (paper.cq.length !== params.cqCount) warnings.push(`Asked for ${params.cqCount} creative questions, got ${paper.cq.length}.`);
  if (paper.mcq.length !== params.mcqCount) warnings.push(`Asked for ${params.mcqCount} MCQs, got ${paper.mcq.length}.`);
  paper.cq.forEach((q, i) => {
    if (q.parts.length !== CQ_PARTS.length) warnings.push(`CQ ${i + 1} has ${q.parts.length} parts instead of 4.`);
    if (q.parts.some((p) => !p.question.trim())) warnings.push(`CQ ${i + 1} has an empty part.`);
  });
  const seen = new Set<string>();
  paper.mcq.forEach((q, i) => {
    const n = i + 1;
    if (q.options.length !== 4) warnings.push(`MCQ ${n} has ${q.options.length} options instead of 4.`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) warnings.push(`MCQ ${n} has no valid correct answer.`);
    const opts = q.options.map((o) => o.trim().toLowerCase());
    if (new Set(opts).size !== opts.length) warnings.push(`MCQ ${n} repeats an option.`);
    const key = q.question.trim().toLowerCase();
    if (seen.has(key)) warnings.push(`MCQ ${n} repeats an earlier question.`);
    seen.add(key);
  });
  return warnings;
}

/** A small seeded random generator, so each set is shuffled the same way every time it's printed. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The MCQs as set `set` (0 = Ka) prints them: set 0 keeps the teacher's order, later sets reorder questions and options. */
export function mcqsForSet(mcq: McqQuestion[], set: number, seed: number): McqQuestion[] {
  if (set === 0) return mcq;
  const rand = seeded(seed + set * 7919);
  return shuffle(mcq, rand).map((q) => {
    const order = shuffle(
      q.options.map((_, i) => i),
      rand
    );
    return { ...q, options: order.map((i) => q.options[i]), correctIndex: order.indexOf(q.correctIndex) };
  });
}

/** A stable number from a job id, used as the shuffle seed. */
export const seedFromId = (id: string) => [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
/** Numbers in the paper's language. */
export const paperNumber = (n: number, language: PaperLanguage) => (language === "bn" ? String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : String(n));

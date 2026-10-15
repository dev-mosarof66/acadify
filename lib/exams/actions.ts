"use server";

import { and, count, eq, inArray, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertInstituteMember } from "@/lib/auth/session";
import { classes, db, examMarks, exams, students, subjects } from "@/lib/db";
import { canMarkSection } from "@/lib/institute/attendance-queries";
import type { GradingScale } from "./grading";

export type ExamResult = { ok: true; id?: string; message?: string } | { ok: false; error: string; field?: string };

const NO_PERMISSION: ExamResult = { ok: false, error: "Only the principal or institute admin can do this." };
const SCALES: GradingScale[] = ["gpa5", "qawmi"];
const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
const field = (form: FormData, k: string, max = 120) => String(form.get(k) ?? "").trim().slice(0, max);
const num = (form: FormData, k: string) => Number(toAsciiDigits(field(form, k)));

/** The value being inserted, in an ON CONFLICT update. */
const sqlExcluded = (col: "marks" | "absent") => sql.raw(`excluded.${col}`);

function refresh() {
  revalidatePath("/dashboard", "layout");
}

/* ---------------------------------------------------------------- subjects */

export async function saveSubject(form: FormData): Promise<ExamResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const id = field(form, "id");
  const classId = field(form, "classId");
  const name = field(form, "name", 60);
  const nameBn = field(form, "nameBn", 60);
  const fullMarks = num(form, "fullMarks");
  const passMarks = num(form, "passMarks");

  if (!name) return { ok: false, error: "Enter the subject name.", field: "name" };
  if (!Number.isInteger(fullMarks) || fullMarks < 1 || fullMarks > 1000) return { ok: false, error: "Full marks must be a whole number, e.g. 100.", field: "fullMarks" };
  if (!Number.isInteger(passMarks) || passMarks < 0 || passMarks > fullMarks) return { ok: false, error: "Pass marks must be between 0 and the full marks.", field: "passMarks" };

  if (id) {
    const [row] = await db
      .update(subjects)
      .set({ name, nameBn, fullMarks, passMarks })
      .where(and(eq(subjects.id, id), eq(subjects.instituteId, instituteId)))
      .returning({ id: subjects.id });
    if (!row) return { ok: false, error: "This subject no longer exists." };
  } else {
    const [cls] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.instituteId, instituteId))).limit(1);
    if (!cls) return { ok: false, error: "Choose the class." };
    const [{ last }] = await db.select({ last: max(subjects.sortOrder) }).from(subjects).where(eq(subjects.classId, classId));
    const [row] = await db
      .insert(subjects)
      .values({ instituteId, classId, name, nameBn, fullMarks, passMarks, sortOrder: (last ?? -1) + 1 })
      .onConflictDoNothing()
      .returning({ id: subjects.id });
    if (!row) return { ok: false, error: `This class already has ${name}.`, field: "name" };
  }
  refresh();
  return { ok: true };
}

export async function deleteSubject(id: string): Promise<ExamResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  const [{ n }] = await db.select({ n: count() }).from(examMarks).where(eq(examMarks.subjectId, id));
  if (n > 0) return { ok: false, error: "This subject has marks entered, so it can't be deleted." };
  await db.delete(subjects).where(and(eq(subjects.id, id), eq(subjects.instituteId, me.active.instituteId)));
  refresh();
  return { ok: true };
}

/* ---------------------------------------------------------------- exams */

export async function saveExam(form: FormData): Promise<ExamResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const id = field(form, "id");
  const name = field(form, "name", 80);
  const startsOn = field(form, "startsOn") || null;
  const gradingScale = field(form, "gradingScale") as GradingScale;

  if (!name) return { ok: false, error: "Enter the exam name, e.g. Half-yearly 2026.", field: "name" };
  if (startsOn && !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return { ok: false, error: "Choose a valid date.", field: "startsOn" };
  if (!SCALES.includes(gradingScale)) return { ok: false, error: "Choose the grading scale.", field: "gradingScale" };

  if (id) {
    const [row] = await db.update(exams).set({ name, startsOn, gradingScale }).where(and(eq(exams.id, id), eq(exams.instituteId, instituteId))).returning({ id: exams.id });
    if (!row) return { ok: false, error: "This exam no longer exists." };
    refresh();
    return { ok: true, id };
  }
  const [row] = await db.insert(exams).values({ instituteId, name, startsOn, gradingScale }).returning({ id: exams.id });
  refresh();
  return { ok: true, id: row.id };
}

/** Publishing makes results visible to students and guardians. */
export async function setExamPublished(examId: string, publish: boolean): Promise<ExamResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  await db
    .update(exams)
    .set({ publishedAt: publish ? new Date() : null })
    .where(and(eq(exams.id, examId), eq(exams.instituteId, me.active.instituteId)));
  refresh();
  return { ok: true };
}

export async function deleteExam(examId: string): Promise<ExamResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  const [{ n }] = await db.select({ n: count() }).from(examMarks).where(eq(examMarks.examId, examId));
  if (n > 0) return { ok: false, error: `This exam has ${n} marks entered. It can't be deleted.` };
  await db.delete(exams).where(and(eq(exams.id, examId), eq(exams.instituteId, me.active.instituteId)));
  refresh();
  return { ok: true };
}

/* ---------------------------------------------------------------- marks */

type Entry = { studentId: string; subjectId: string; marks: number | null; absent: boolean };

/** Saves a section's marks. Empty cells clear any earlier mark. Teachers can only save their own sections. */
export async function saveMarks(examId: string, sectionId: string, entries: Entry[]): Promise<ExamResult> {
  const me = await assertInstituteMember("exams:write");
  if (!me) return { ok: false, error: "Your role can't enter marks." };
  const instituteId = me.active.instituteId;
  const scope = { instituteId, memberId: me.active.memberId, role: me.active.role, sectionId };
  if (!(await canMarkSection(scope))) return { ok: false, error: "You're not assigned to this section." };

  const [exam] = await db.select({ id: exams.id, publishedAt: exams.publishedAt }).from(exams).where(and(eq(exams.id, examId), eq(exams.instituteId, instituteId))).limit(1);
  if (!exam) return { ok: false, error: "This exam no longer exists." };
  if (exam.publishedAt) return { ok: false, error: "Results are published. Ask your principal to unpublish before changing marks." };

  const roster = new Set(
    (await db.select({ id: students.id }).from(students).where(and(eq(students.sectionId, sectionId), eq(students.status, "active")))).map((s) => s.id)
  );
  const subs = await db
    .select({ id: subjects.id, fullMarks: subjects.fullMarks, name: subjects.name })
    .from(subjects)
    .where(
      inArray(
        subjects.id,
        [...new Set(entries.map((e) => e.subjectId))].filter((id) => /^[0-9a-f-]{36}$/i.test(id))
      )
    );
  const full = new Map(subs.map((s) => [s.id, s]));

  const keep: Entry[] = [];
  const clear: Entry[] = [];
  for (const e of entries) {
    const sub = full.get(e.subjectId);
    if (!roster.has(e.studentId) || !sub) continue;
    if (e.absent) keep.push({ ...e, marks: null });
    else if (e.marks === null) clear.push(e);
    else {
      if (!Number.isInteger(e.marks) || e.marks < 0 || e.marks > sub.fullMarks) {
        return { ok: false, error: `${sub.name} marks must be between 0 and ${sub.fullMarks}.` };
      }
      keep.push(e);
    }
  }

  if (keep.length) {
    await db
      .insert(examMarks)
      .values(keep.map((e) => ({ examId, studentId: e.studentId, subjectId: e.subjectId, marks: e.marks, absent: e.absent, enteredBy: me.id })))
      .onConflictDoUpdate({
        target: [examMarks.examId, examMarks.studentId, examMarks.subjectId],
        set: { marks: sqlExcluded("marks"), absent: sqlExcluded("absent"), enteredBy: me.id, updatedAt: new Date() },
      });
  }
  for (const e of clear) {
    await db.delete(examMarks).where(and(eq(examMarks.examId, examId), eq(examMarks.studentId, e.studentId), eq(examMarks.subjectId, e.subjectId)));
  }
  refresh();
  return { ok: true, message: `Saved ${keep.length} marks.` };
}

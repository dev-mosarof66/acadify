import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { classes, db, examMarks, exams, institutes, sections, students, subjects } from "@/lib/db";
import { gradeSubject, meritPositions, overallResult, type GradingScale, type OverallResult, type SubjectGrade } from "./grading";

export interface SubjectView {
  id: string;
  classId: string;
  name: string;
  nameBn: string;
  fullMarks: number;
  passMarks: number;
}

export async function getSubjects(instituteId: string): Promise<SubjectView[]> {
  const rows = await db
    .select({ id: subjects.id, classId: subjects.classId, name: subjects.name, nameBn: subjects.nameBn, fullMarks: subjects.fullMarks, passMarks: subjects.passMarks })
    .from(subjects)
    .innerJoin(classes, eq(subjects.classId, classes.id))
    .where(eq(subjects.instituteId, instituteId))
    .orderBy(asc(classes.sortOrder), asc(subjects.sortOrder), asc(subjects.name));
  return rows;
}

export interface ExamView {
  id: string;
  name: string;
  startsOn: string | null;
  gradingScale: GradingScale;
  published: boolean;
  marksEntered: number;
}

export async function getExams(instituteId: string): Promise<ExamView[]> {
  const rows = await db
    .select({
      id: exams.id,
      name: exams.name,
      startsOn: exams.startsOn,
      gradingScale: exams.gradingScale,
      publishedAt: exams.publishedAt,
      marksEntered: sql<number>`(select count(*) from ${examMarks} where ${examMarks.examId} = ${exams.id})::int`,
    })
    .from(exams)
    .where(eq(exams.instituteId, instituteId))
    .orderBy(desc(exams.createdAt));
  return rows.map((r) => ({ id: r.id, name: r.name, startsOn: r.startsOn, gradingScale: r.gradingScale, published: Boolean(r.publishedAt), marksEntered: r.marksEntered }));
}

export async function getExam(instituteId: string, examId: string): Promise<ExamView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(examId)) return null;
  return (await getExams(instituteId)).find((e) => e.id === examId) ?? null;
}

/** Marks entered vs needed for each section (students × the class's subjects). */
export async function getExamProgress(instituteId: string, examId: string) {
  const [secs, subjectCounts, studentCounts, entered] = await Promise.all([
    db
      .select({ sectionId: sections.id, classId: sections.classId, sectionName: sections.name, shift: sections.shift, className: classes.name })
      .from(sections)
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(eq(sections.instituteId, instituteId))
      .orderBy(asc(classes.sortOrder), asc(sections.shift), asc(sections.name)),
    db.select({ classId: subjects.classId, n: sql<number>`count(*)::int` }).from(subjects).where(eq(subjects.instituteId, instituteId)).groupBy(subjects.classId),
    db
      .select({ sectionId: students.sectionId, n: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.instituteId, instituteId), eq(students.status, "active")))
      .groupBy(students.sectionId),
    db
      .select({ sectionId: students.sectionId, n: sql<number>`count(*)::int` })
      .from(examMarks)
      .innerJoin(students, eq(examMarks.studentId, students.id))
      .where(and(eq(examMarks.examId, examId), eq(students.status, "active")))
      .groupBy(students.sectionId),
  ]);
  const subjectsIn = new Map(subjectCounts.map((s) => [s.classId, s.n]));
  const studentsIn = new Map(studentCounts.map((s) => [s.sectionId, s.n]));
  const enteredIn = new Map(entered.map((e) => [e.sectionId, e.n]));
  return secs.map((s) => ({
    ...s,
    subjects: subjectsIn.get(s.classId) ?? 0,
    students: studentsIn.get(s.sectionId) ?? 0,
    entered: enteredIn.get(s.sectionId) ?? 0,
    needed: (subjectsIn.get(s.classId) ?? 0) * (studentsIn.get(s.sectionId) ?? 0),
  }));
}

/** A section's marks sheet: students (by roll) × the class's subjects, with what's been entered. */
export async function getMarksSheet(instituteId: string, examId: string, sectionId: string) {
  const [sec] = await db
    .select({ id: sections.id, name: sections.name, shift: sections.shift, classId: sections.classId, className: classes.name })
    .from(sections)
    .innerJoin(classes, eq(sections.classId, classes.id))
    .where(and(eq(sections.id, sectionId), eq(sections.instituteId, instituteId)))
    .limit(1);
  if (!sec) return null;

  const [subs, roster] = await Promise.all([
    db.select().from(subjects).where(eq(subjects.classId, sec.classId)).orderBy(asc(subjects.sortOrder), asc(subjects.name)),
    db
      .select({ id: students.id, name: students.name, roll: students.roll, studentCode: students.studentCode })
      .from(students)
      .where(and(eq(students.sectionId, sectionId), eq(students.status, "active")))
      .orderBy(asc(students.roll)),
  ]);
  const marks = roster.length
    ? await db
        .select({ studentId: examMarks.studentId, subjectId: examMarks.subjectId, marks: examMarks.marks, absent: examMarks.absent })
        .from(examMarks)
        .where(
          and(
            eq(examMarks.examId, examId),
            inArray(
              examMarks.studentId,
              roster.map((r) => r.id)
            )
          )
        )
    : [];

  return {
    section: sec,
    subjects: subs.map((s) => ({ id: s.id, name: s.name, fullMarks: s.fullMarks, passMarks: s.passMarks })),
    students: roster,
    marks: Object.fromEntries(marks.map((m) => [`${m.studentId}:${m.subjectId}`, { marks: m.marks, absent: m.absent }])) as Record<string, { marks: number | null; absent: boolean }>,
  };
}

export interface ResultRow {
  studentId: string;
  name: string;
  roll: number;
  studentCode: string;
  subjects: (SubjectGrade & { subjectId: string; marks: number | null; absent: boolean })[];
  result: OverallResult;
  position: number | null;
}

/** Tabulation for one section: every student's subject grades, overall result and merit position. */
export async function getSectionResults(instituteId: string, examId: string, sectionId: string, scale: GradingScale) {
  const sheet = await getMarksSheet(instituteId, examId, sectionId);
  if (!sheet) return null;
  const rows = sheet.students.map((st) => {
    const scores = sheet.subjects.map((sub) => {
      const m = sheet.marks[`${st.id}:${sub.id}`];
      return { subjectId: sub.id, marks: m?.marks ?? null, absent: m?.absent ?? false, fullMarks: sub.fullMarks, passMarks: sub.passMarks };
    });
    return {
      id: st.id,
      studentId: st.id,
      name: st.name,
      roll: st.roll,
      studentCode: st.studentCode,
      subjects: scores.map((s) => ({ ...gradeSubject(scale, s), subjectId: s.subjectId, marks: s.marks, absent: s.absent })),
      result: overallResult(scale, scores),
    };
  });
  const positions = meritPositions(rows.filter((r) => r.result.complete));
  return {
    section: sheet.section,
    subjects: sheet.subjects,
    rows: rows.map<ResultRow>((r) => ({ ...r, position: positions.get(r.id) ?? null })),
  };
}

/** Everything a printed report card needs. */
export async function getReportCard(instituteId: string, examId: string, studentId: string) {
  const exam = await getExam(instituteId, examId);
  if (!exam || !/^[0-9a-f-]{36}$/i.test(studentId)) return null;
  const [st] = await db
    .select({ sectionId: students.sectionId, guardianName: students.guardianName, instituteName: institutes.name, district: institutes.district })
    .from(students)
    .innerJoin(institutes, eq(students.instituteId, institutes.id))
    .where(and(eq(students.id, studentId), eq(students.instituteId, instituteId)))
    .limit(1);
  if (!st) return null;
  const results = await getSectionResults(instituteId, examId, st.sectionId, exam.gradingScale);
  const row = results?.rows.find((r) => r.studentId === studentId);
  if (!results || !row) return null;
  return {
    exam,
    institute: { name: st.instituteName, district: st.district },
    section: results.section,
    subjects: results.subjects,
    row,
    guardianName: st.guardianName,
    classSize: results.rows.length,
  };
}

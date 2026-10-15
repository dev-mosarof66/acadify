import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { classes, db, hifzLogs, hifzParas, sections, students } from "@/lib/db";

export type HifzRating = "mumtaz" | "jayyid_jiddan" | "jayyid" | "maqbul" | "needs_work";

export interface HifzLog {
  date: string;
  sabak: string;
  sabakPara: number | null;
  sabki: string;
  dour: string;
  rating: HifzRating | null;
  note: string;
  teacherName: string;
}

const toLog = (r: typeof hifzLogs.$inferSelect): HifzLog => ({
  date: r.date,
  sabak: r.sabak,
  sabakPara: r.sabakPara,
  sabki: r.sabki,
  dour: r.dour,
  rating: r.rating,
  note: r.note,
  teacherName: r.teacherName,
});

/** A section's students with that day's lesson (if recorded) and how many paras each has memorized. */
export async function getHifzSection(instituteId: string, sectionId: string, date: string) {
  const [sec] = await db
    .select({ id: sections.id, name: sections.name, className: classes.name })
    .from(sections)
    .innerJoin(classes, eq(sections.classId, classes.id))
    .where(and(eq(sections.id, sectionId), eq(sections.instituteId, instituteId)))
    .limit(1);
  if (!sec) return null;

  const roster = await db
    .select({ id: students.id, name: students.name, roll: students.roll, photoKey: students.photoKey })
    .from(students)
    .where(and(eq(students.sectionId, sectionId), eq(students.status, "active")))
    .orderBy(asc(students.roll));
  const ids = roster.map((r) => r.id);
  const [logs, paras] = ids.length
    ? await Promise.all([
        db.select().from(hifzLogs).where(and(inArray(hifzLogs.studentId, ids), eq(hifzLogs.date, date))),
        db.select({ studentId: hifzParas.studentId }).from(hifzParas).where(inArray(hifzParas.studentId, ids)),
      ])
    : [[], []];

  return {
    section: sec,
    students: roster.map((r) => ({
      id: r.id,
      name: r.name,
      roll: r.roll,
      hasPhoto: Boolean(r.photoKey),
      log: (() => {
        const l = logs.find((x) => x.studentId === r.id);
        return l ? toLog(l) : null;
      })(),
      paras: paras.filter((p) => p.studentId === r.id).length,
    })),
  };
}

/** One student's memorized paras and recent lessons. */
export async function getHifzStudent(instituteId: string, studentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return null;
  const [st] = await db
    .select({ id: students.id, name: students.name, roll: students.roll, sectionId: students.sectionId, sectionName: sections.name, className: classes.name })
    .from(students)
    .innerJoin(sections, eq(students.sectionId, sections.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(and(eq(students.id, studentId), eq(students.instituteId, instituteId)))
    .limit(1);
  if (!st) return null;
  const [paras, logs] = await Promise.all([
    db.select({ para: hifzParas.para, completedOn: hifzParas.completedOn }).from(hifzParas).where(eq(hifzParas.studentId, studentId)),
    db.select().from(hifzLogs).where(eq(hifzLogs.studentId, studentId)).orderBy(desc(hifzLogs.date)).limit(30),
  ]);
  return { student: st, paras: Object.fromEntries(paras.map((p) => [p.para, p.completedOn])) as Record<number, string>, logs: logs.map(toLog) };
}

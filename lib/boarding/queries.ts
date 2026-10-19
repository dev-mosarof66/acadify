import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { classes, db, mealLogs, sections, students } from "@/lib/db";

export interface BoarderRow {
  id: string;
  name: string;
  nameBn: string;
  className: string;
  sectionName: string;
  roll: number;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

/** Active boarders with their meals for the day (all false until recorded). */
export async function getBoarders(instituteId: string, date: string): Promise<BoarderRow[]> {
  const rows = await db
    .select({
      id: students.id,
      name: students.name,
      nameBn: students.nameBn,
      className: classes.name,
      sectionName: sections.name,
      roll: students.roll,
      breakfast: mealLogs.breakfast,
      lunch: mealLogs.lunch,
      dinner: mealLogs.dinner,
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(sections, eq(students.sectionId, sections.id))
    .leftJoin(mealLogs, and(eq(mealLogs.studentId, students.id), eq(mealLogs.date, date)))
    .where(and(eq(students.instituteId, instituteId), eq(students.status, "active"), eq(students.isBoarder, true)))
    .orderBy(asc(classes.sortOrder), asc(sections.name), asc(students.roll));
  return rows.map((r) => ({ ...r, breakfast: r.breakfast ?? false, lunch: r.lunch ?? false, dinner: r.dinner ?? false }));
}

/** Active non-boarders, to pick who to move into the boarding. */
export async function getNonBoarders(instituteId: string) {
  return db
    .select({ id: students.id, name: students.name, className: classes.name, sectionName: sections.name, roll: students.roll })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(sections, eq(students.sectionId, sections.id))
    .where(and(eq(students.instituteId, instituteId), eq(students.status, "active"), eq(students.isBoarder, false)))
    .orderBy(asc(classes.sortOrder), asc(sections.name), asc(students.roll));
}

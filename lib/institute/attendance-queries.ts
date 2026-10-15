import "server-only";

import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import { ADMIN_ROLES, type InstituteRole } from "@/lib/auth/rbac";
import { attendance, classes, db, sectionTeachers, sections, students } from "@/lib/db";
import type { Shift } from "./queries";

export type AttendanceStatus = "present" | "absent" | "late" | "leave";

/** "2026-10-16" in Dhaka for a moment in time. */
export const dhakaDate = (ms: number) => new Date(ms + 6 * 3600_000).toISOString().slice(0, 10);

/** Principals and institute admins can mark any section; teachers only the ones they're assigned to. */
export const marksAllSections = (role: InstituteRole) => ADMIN_ROLES.includes(role);

export interface SectionDay {
  sectionId: string;
  className: string;
  sectionName: string;
  shift: Shift;
  students: number;
  /** Null until attendance is taken that day. */
  taken: null | { present: number; absent: number; late: number; leave: number };
  isClassTeacher: boolean;
}

/** Sections this member can mark, with that day's attendance status. */
export async function getSectionsForDay(o: { instituteId: string; memberId: string; role: InstituteRole; date: string }): Promise<SectionDay[]> {
  const all = marksAllSections(o.role);
  const rows = await db
    .select({
      sectionId: sections.id,
      sectionName: sections.name,
      shift: sections.shift,
      className: classes.name,
      sort: classes.sortOrder,
      isClassTeacher: sql<boolean>`coalesce(bool_or(${sectionTeachers.isClassTeacher}) filter (where ${sectionTeachers.memberId} = ${o.memberId}), false)`,
      assigned: sql<boolean>`coalesce(bool_or(${sectionTeachers.memberId} = ${o.memberId}), false)`,
    })
    .from(sections)
    .innerJoin(classes, eq(sections.classId, classes.id))
    .leftJoin(sectionTeachers, eq(sectionTeachers.sectionId, sections.id))
    .where(eq(sections.instituteId, o.instituteId))
    .groupBy(sections.id, classes.name, classes.sortOrder)
    .orderBy(asc(classes.sortOrder), asc(sections.shift), asc(sections.name));

  const mine = rows.filter((r) => all || r.assigned);
  if (!mine.length) return [];

  const [counts, marks] = await Promise.all([
    db
      .select({ sectionId: students.sectionId, n: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.instituteId, o.instituteId), eq(students.status, "active")))
      .groupBy(students.sectionId),
    db
      .select({ sectionId: attendance.sectionId, status: attendance.status, n: sql<number>`count(*)::int` })
      .from(attendance)
      .where(and(eq(attendance.instituteId, o.instituteId), eq(attendance.date, o.date)))
      .groupBy(attendance.sectionId, attendance.status),
  ]);
  const studentsIn = new Map(counts.map((c) => [c.sectionId, c.n]));

  return mine.map((r) => {
    const m = marks.filter((x) => x.sectionId === r.sectionId);
    const get = (s: AttendanceStatus) => m.find((x) => x.status === s)?.n ?? 0;
    return {
      sectionId: r.sectionId,
      className: r.className,
      sectionName: r.sectionName,
      shift: r.shift,
      students: studentsIn.get(r.sectionId) ?? 0,
      taken: m.length ? { present: get("present"), absent: get("absent"), late: get("late"), leave: get("leave") } : null,
      isClassTeacher: r.isClassTeacher,
    };
  });
}

/** Whether this member may mark this section (and that it belongs to their institute). */
export async function canMarkSection(o: { instituteId: string; memberId: string; role: InstituteRole; sectionId: string }) {
  const [sec] = await db
    .select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.id, o.sectionId), eq(sections.instituteId, o.instituteId)))
    .limit(1);
  if (!sec) return false;
  if (marksAllSections(o.role)) return true;
  const [assigned] = await db
    .select({ id: sectionTeachers.id })
    .from(sectionTeachers)
    .where(and(eq(sectionTeachers.sectionId, o.sectionId), eq(sectionTeachers.memberId, o.memberId)))
    .limit(1);
  return Boolean(assigned);
}

export interface SheetRow {
  studentId: string;
  name: string;
  nameBn: string;
  roll: number;
  hasPhoto: boolean;
  guardianPhone: string;
  status: AttendanceStatus | null;
  smsSent: boolean;
}

/** One section's students for a day, with any attendance already marked. */
export async function getAttendanceSheet(instituteId: string, sectionId: string, date: string) {
  const [sec] = await db
    .select({ id: sections.id, name: sections.name, shift: sections.shift, className: classes.name })
    .from(sections)
    .innerJoin(classes, eq(sections.classId, classes.id))
    .where(and(eq(sections.id, sectionId), eq(sections.instituteId, instituteId)))
    .limit(1);
  if (!sec) return null;

  const rows = await db
    .select({
      studentId: students.id,
      name: students.name,
      nameBn: students.nameBn,
      roll: students.roll,
      photoKey: students.photoKey,
      guardianPhone: students.guardianPhone,
      status: attendance.status,
      smsSentAt: attendance.smsSentAt,
      updatedAt: attendance.updatedAt,
    })
    .from(students)
    .leftJoin(attendance, and(eq(attendance.studentId, students.id), eq(attendance.date, date)))
    .where(and(eq(students.sectionId, sectionId), eq(students.status, "active")))
    .orderBy(asc(students.roll));

  const markedAt = rows.reduce<Date | null>((latest, r) => (r.updatedAt && (!latest || r.updatedAt > latest) ? r.updatedAt : latest), null);
  return {
    section: { id: sec.id, name: sec.name, shift: sec.shift, className: sec.className },
    taken: rows.some((r) => r.status),
    markedAt: markedAt?.toISOString() ?? null,
    rows: rows.map<SheetRow>((r) => ({
      studentId: r.studentId,
      name: r.name,
      nameBn: r.nameBn,
      roll: r.roll,
      hasPhoto: Boolean(r.photoKey),
      guardianPhone: r.guardianPhone,
      status: r.status,
      smsSent: Boolean(r.smsSentAt),
    })),
  };
}

/** A student's attendance between two dates (inclusive): counts per status and the days they missed. */
export async function getStudentAttendance(instituteId: string, studentId: string, from: string, to: string) {
  const rows = await db
    .select({ date: attendance.date, status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.instituteId, instituteId), eq(attendance.studentId, studentId), gte(attendance.date, from), lte(attendance.date, to)))
    .orderBy(asc(attendance.date));
  const count = (s: AttendanceStatus) => rows.filter((r) => r.status === s).length;
  return {
    days: rows.length,
    present: count("present"),
    late: count("late"),
    absent: count("absent"),
    leave: count("leave"),
    missed: rows.filter((r) => r.status === "absent").map((r) => r.date),
  };
}

export interface SectionAssignment {
  sectionId: string;
  className: string;
  sectionName: string;
  shift: Shift;
  teachers: { memberId: string; isClassTeacher: boolean }[];
}

/** Every section with its assigned teachers (for the principal's "Teachers" setup). */
export async function getSectionAssignments(instituteId: string): Promise<SectionAssignment[]> {
  const [secs, links] = await Promise.all([
    db
      .select({ sectionId: sections.id, sectionName: sections.name, shift: sections.shift, className: classes.name })
      .from(sections)
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(eq(sections.instituteId, instituteId))
      .orderBy(asc(classes.sortOrder), asc(sections.shift), asc(sections.name)),
    db
      .select({ sectionId: sectionTeachers.sectionId, memberId: sectionTeachers.memberId, isClassTeacher: sectionTeachers.isClassTeacher })
      .from(sectionTeachers)
      .where(eq(sectionTeachers.instituteId, instituteId)),
  ]);
  return secs.map((s) => ({ ...s, teachers: links.filter((l) => l.sectionId === s.sectionId).map((l) => ({ memberId: l.memberId, isClassTeacher: l.isClassTeacher })) }));
}

import "server-only";

import { and, asc, count, eq, sql } from "drizzle-orm";

import type { InstituteRole } from "@/lib/auth/rbac";
import { classes, db, instituteMembers, sections, students } from "@/lib/db";

/*
 * Everything here is scoped to one institute: callers pass the signed-in member's active institute id,
 * never an id that came from the browser.
 */

export type Shift = "morning" | "day" | "evening";
export type Gender = "male" | "female";
export type StudentStatus = "active" | "left" | "graduated";

export interface SectionView {
  id: string;
  classId: string;
  name: string;
  shift: Shift;
  capacity: number | null;
  students: number;
}

export interface ClassView {
  id: string;
  name: string;
  nameBn: string;
  sortOrder: number;
  sections: SectionView[];
  students: number;
}

export async function getClasses(instituteId: string): Promise<ClassView[]> {
  const [classRows, sectionRows, counts] = await Promise.all([
    db.select().from(classes).where(eq(classes.instituteId, instituteId)).orderBy(asc(classes.sortOrder), asc(classes.name)),
    db.select().from(sections).where(eq(sections.instituteId, instituteId)).orderBy(asc(sections.shift), asc(sections.name)),
    db
      .select({ sectionId: students.sectionId, n: count() })
      .from(students)
      .where(and(eq(students.instituteId, instituteId), eq(students.status, "active")))
      .groupBy(students.sectionId),
  ]);
  const bySection = new Map(counts.map((c) => [c.sectionId, c.n]));
  return classRows.map((c) => {
    const secs = sectionRows
      .filter((s) => s.classId === c.id)
      .map<SectionView>((s) => ({ id: s.id, classId: s.classId, name: s.name, shift: s.shift, capacity: s.capacity, students: bySection.get(s.id) ?? 0 }));
    return { id: c.id, name: c.name, nameBn: c.nameBn, sortOrder: c.sortOrder, sections: secs, students: secs.reduce((n, s) => n + s.students, 0) };
  });
}

export interface StudentRow {
  id: string;
  studentCode: string;
  name: string;
  nameBn: string;
  gender: Gender;
  dateOfBirth: string | null;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  shift: Shift;
  roll: number;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  address: string;
  hasPhoto: boolean;
  status: StudentStatus;
  admittedOn: string;
}

const studentSelect = {
  s: students,
  className: classes.name,
  sectionName: sections.name,
  shift: sections.shift,
};

function toStudentRow(r: { s: typeof students.$inferSelect; className: string; sectionName: string; shift: Shift }): StudentRow {
  const { s } = r;
  return {
    id: s.id,
    studentCode: s.studentCode,
    name: s.name,
    nameBn: s.nameBn,
    gender: s.gender,
    dateOfBirth: s.dateOfBirth,
    classId: s.classId,
    className: r.className,
    sectionId: s.sectionId,
    sectionName: r.sectionName,
    shift: r.shift,
    roll: s.roll,
    guardianName: s.guardianName,
    guardianRelation: s.guardianRelation,
    guardianPhone: s.guardianPhone,
    address: s.address,
    hasPhoto: Boolean(s.photoKey),
    status: s.status,
    admittedOn: s.admittedOn,
  };
}

/** All students of the institute (any status), ordered by class, section and roll. Filtering happens in the browser. */
export async function getStudents(instituteId: string): Promise<StudentRow[]> {
  const rows = await db
    .select(studentSelect)
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(sections, eq(students.sectionId, sections.id))
    .where(eq(students.instituteId, instituteId))
    .orderBy(asc(classes.sortOrder), asc(sections.name), asc(students.roll));
  return rows.map(toStudentRow);
}

export async function getStudent(instituteId: string, id: string): Promise<StudentRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select(studentSelect)
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(sections, eq(students.sectionId, sections.id))
    .where(and(eq(students.instituteId, instituteId), eq(students.id, id)))
    .limit(1);
  return row ? toStudentRow(row) : null;
}

/** The photo's storage key, only if the student belongs to this institute. */
export async function getStudentPhotoKey(instituteId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select({ key: students.photoKey })
    .from(students)
    .where(and(eq(students.instituteId, instituteId), eq(students.id, id)))
    .limit(1);
  return row?.key ?? null;
}

export interface StaffRow {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: InstituteRole;
  lastActive: string;
  addedAt: string;
}

export async function getStaff(instituteId: string): Promise<StaffRow[]> {
  const result = await db.execute<{
    id: string;
    user_id: string;
    name: string | null;
    email: string | null;
    role: InstituteRole;
    last_active_at: string | null;
    created_at: string;
  }>(sql`
    select m.id, m.user_id, u.name, u.email, m.role, m.last_active_at, m.created_at
    from ${instituteMembers} m
    -- neon_auth ids are uuid; ours are stored as text
    left join neon_auth."user" u on u.id::text = m.user_id
    where m.institute_id = ${instituteId}
    order by m.created_at
  `);
  return result.rows.map((r) => ({
    memberId: r.id,
    userId: r.user_id,
    name: r.name ?? "Unknown",
    email: r.email ?? "",
    role: r.role,
    lastActive: r.last_active_at ? new Date(r.last_active_at).toISOString() : "",
    addedAt: new Date(r.created_at).toISOString(),
  }));
}

export async function getDashboardStats(instituteId: string) {
  const [[studentTotals], [classCount], [staffCount]] = await Promise.all([
    db
      .select({
        active: sql<number>`count(*) filter (where ${students.status} = 'active')::int`,
        girls: sql<number>`count(*) filter (where ${students.status} = 'active' and ${students.gender} = 'female')::int`,
      })
      .from(students)
      .where(eq(students.instituteId, instituteId)),
    db.select({ n: count() }).from(classes).where(eq(classes.instituteId, instituteId)),
    db.select({ n: count() }).from(instituteMembers).where(eq(instituteMembers.instituteId, instituteId)),
  ]);
  return {
    students: studentTotals?.active ?? 0,
    girls: studentTotals?.girls ?? 0,
    classes: classCount?.n ?? 0,
    staff: staffCount?.n ?? 0,
  };
}

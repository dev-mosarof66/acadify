import "server-only";

import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";

import type { InstituteRole } from "@/lib/auth/rbac";
import { classes, db, exams, instituteMembers, sections, studentAccess, students } from "@/lib/db";

/** Students and guardians use the portal instead of the staff dashboard. */
export const isPortalRole = (role: InstituteRole) => role === "student" || role === "guardian";

export interface LinkedStudent {
  id: string;
  name: string;
  nameBn: string;
  roll: number;
  studentCode: string;
  classId: string;
  className: string;
  sectionName: string;
  hasPhoto: boolean;
}

/** The students this portal account may see. */
export async function getLinkedStudents(memberId: string): Promise<LinkedStudent[]> {
  const rows = await db
    .select({
      id: students.id,
      name: students.name,
      nameBn: students.nameBn,
      roll: students.roll,
      studentCode: students.studentCode,
      classId: students.classId,
      className: classes.name,
      sectionName: sections.name,
      photoKey: students.photoKey,
    })
    .from(studentAccess)
    .innerJoin(students, eq(studentAccess.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(sections, eq(students.sectionId, sections.id))
    .where(eq(studentAccess.memberId, memberId))
    .orderBy(asc(students.name));
  return rows.map(({ photoKey, ...r }) => ({ ...r, hasPhoto: Boolean(photoKey) }));
}

export async function canSeeStudent(memberId: string, studentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return false;
  const [row] = await db
    .select({ id: studentAccess.id })
    .from(studentAccess)
    .where(and(eq(studentAccess.memberId, memberId), eq(studentAccess.studentId, studentId)))
    .limit(1);
  return Boolean(row);
}

/** Who has portal access to a student (for the staff view of that student). */
export async function getStudentAccess(instituteId: string, studentId: string) {
  const rows = await db.execute<{ id: string; role: InstituteRole; name: string | null; email: string | null; last_active_at: string | null }>(sql`
    select a.id, m.role, u.name, u.email, m.last_active_at
    from ${studentAccess} a
    join ${instituteMembers} m on m.id = a.member_id
    -- neon_auth ids are uuid; ours are stored as text
    left join neon_auth."user" u on u.id::text = m.user_id
    where a.institute_id = ${instituteId} and a.student_id = ${studentId}
    order by a.created_at
  `);
  return rows.rows.map((r) => ({
    id: r.id,
    role: r.role,
    name: r.name ?? "Unknown",
    email: r.email ?? "",
    lastActive: r.last_active_at ? new Date(r.last_active_at).toISOString() : "",
  }));
}

/** Published exams, newest first. */
export async function getPublishedExams(instituteId: string) {
  return db
    .select({ id: exams.id, name: exams.name, publishedAt: exams.publishedAt })
    .from(exams)
    .where(and(eq(exams.instituteId, instituteId), isNotNull(exams.publishedAt)))
    .orderBy(desc(exams.publishedAt));
}

/** Whether a portal account has a linked student in this class (for lecture sheet downloads). */
export async function canSeeClass(memberId: string, classId: string) {
  const [row] = await db
    .select({ id: studentAccess.id })
    .from(studentAccess)
    .innerJoin(students, eq(studentAccess.studentId, students.id))
    .where(and(eq(studentAccess.memberId, memberId), eq(students.classId, classId)))
    .limit(1);
  return Boolean(row);
}

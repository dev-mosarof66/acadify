"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertInstituteMember } from "@/lib/auth/session";
import { attendance, db, instituteMembers, sectionTeachers, sections, students } from "@/lib/db";
import { sendInstituteSms } from "@/lib/sms/send";
import { canMarkSection, dhakaDate, type AttendanceStatus } from "./attendance-queries";

export type AttendanceResult = { ok: true; message?: string } | { ok: false; error: string };

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "leave"];
/** Attendance can be corrected for up to this many days back. */
const EDIT_DAYS = 7;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function dateAllowed(date: string) {
  if (!DAY.test(date)) return false;
  const today = dhakaDate(Date.now());
  const earliest = dhakaDate(Date.now() - EDIT_DAYS * 86_400_000);
  return date <= today && date >= earliest;
}

/** Saves a whole section's attendance for a day (first time or a correction). */
export async function saveAttendance(sectionId: string, date: string, entries: { studentId: string; status: AttendanceStatus }[]): Promise<AttendanceResult> {
  const me = await assertInstituteMember("attendance:write");
  if (!me) return { ok: false, error: "Your role can't take attendance." };
  if (!dateAllowed(date)) return { ok: false, error: `Attendance can be taken for today or corrected for the last ${EDIT_DAYS} days.` };
  const scope = { instituteId: me.active.instituteId, memberId: me.active.memberId, role: me.active.role, sectionId };
  if (!(await canMarkSection(scope))) return { ok: false, error: "You're not assigned to this section. Ask your principal." };

  const clean = entries.filter((e) => STATUSES.includes(e.status));
  if (!clean.length) return { ok: false, error: "There are no students to mark." };

  // Only students who are active in this section
  const valid = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.sectionId, sectionId),
        eq(students.status, "active"),
        inArray(
          students.id,
          clean.map((e) => e.studentId)
        )
      )
    );
  const ok = new Set(valid.map((v) => v.id));
  const rows = clean.filter((e) => ok.has(e.studentId));

  await db
    .insert(attendance)
    .values(rows.map((e) => ({ instituteId: me.active.instituteId, sectionId, studentId: e.studentId, date, status: e.status, markedBy: me.id })))
    .onConflictDoUpdate({
      target: [attendance.studentId, attendance.date],
      set: { status: sql`excluded.status`, sectionId: sql`excluded.section_id`, markedBy: sql`excluded.marked_by`, updatedAt: new Date() },
    });

  revalidatePath("/dashboard", "layout");
  const absent = rows.filter((r) => r.status === "absent").length;
  return { ok: true, message: `Saved: ${rows.length - absent} in class, ${absent} absent.` };
}

/** Texts the guardians of students marked absent that day who haven't been texted yet. */
export async function sendAbsenceSms(sectionId: string, date: string): Promise<AttendanceResult> {
  const me = await assertInstituteMember("attendance:write");
  if (!me) return { ok: false, error: "Your role can't send attendance SMS." };
  const scope = { instituteId: me.active.instituteId, memberId: me.active.memberId, role: me.active.role, sectionId };
  if (!(await canMarkSection(scope))) return { ok: false, error: "You're not assigned to this section." };

  const absent = await db
    .select({ id: attendance.id, name: students.name, nameBn: students.nameBn, phone: students.guardianPhone })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .where(and(eq(attendance.sectionId, sectionId), eq(attendance.date, date), eq(attendance.status, "absent"), isNull(attendance.smsSentAt)));
  if (!absent.length) return { ok: false, error: "Every absent student's guardian has already been texted." };

  const [d, m] = [date.slice(8, 10), date.slice(5, 7)];
  const institute = me.active.instituteName;
  const result = await sendInstituteSms(
    me.active.instituteId,
    absent.map((a) => ({ to: a.phone, body: `প্রিয় অভিভাবক, ${a.nameBn || a.name} আজ (${d}/${m}) অনুপস্থিত ছিল। - ${institute}` }))
  );

  if (!result.ok) {
    if (result.reason === "not-connected") return { ok: false, error: "SMS isn't set up yet. Acadify will turn it on soon; the absences are saved." };
    if (result.reason === "no-credit") return { ok: false, error: `Not enough SMS credit: this needs ${result.needed} and ${result.balance} are left. Ask Acadify to add credits.` };
    return { ok: false, error: "There was nothing to send." };
  }
  // Mark the ones that went out (failures can be retried)
  if (result.sent) {
    await db
      .update(attendance)
      .set({ smsSentAt: new Date() })
      .where(
        inArray(
          attendance.id,
          absent.map((a) => a.id)
        )
      );
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: result.failed ? `${result.sent} SMS sent, ${result.failed} failed.` : `${result.sent} guardians texted.` };
}

/* ---------------------------------------------------------------- teacher assignments */

/** Gives a teacher a section (optionally as its class teacher), or takes it away. */
export async function setSectionTeacher(sectionId: string, memberId: string, assign: boolean, isClassTeacher = false): Promise<AttendanceResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return { ok: false, error: "Only the principal or institute admin can assign teachers." };
  const instituteId = me.active.instituteId;

  const [[sec], [member]] = await Promise.all([
    db.select({ id: sections.id }).from(sections).where(and(eq(sections.id, sectionId), eq(sections.instituteId, instituteId))).limit(1),
    db.select({ id: instituteMembers.id }).from(instituteMembers).where(and(eq(instituteMembers.id, memberId), eq(instituteMembers.instituteId, instituteId))).limit(1),
  ]);
  if (!sec || !member) return { ok: false, error: "That section or person isn't in your institute." };

  if (!assign) {
    await db.delete(sectionTeachers).where(and(eq(sectionTeachers.sectionId, sectionId), eq(sectionTeachers.memberId, memberId)));
  } else {
    // One class teacher per section
    if (isClassTeacher) await db.update(sectionTeachers).set({ isClassTeacher: false }).where(eq(sectionTeachers.sectionId, sectionId));
    await db
      .insert(sectionTeachers)
      .values({ instituteId, sectionId, memberId, isClassTeacher })
      .onConflictDoUpdate({ target: [sectionTeachers.sectionId, sectionTeachers.memberId], set: { isClassTeacher } });
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

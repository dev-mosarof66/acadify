"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertInstituteMember } from "@/lib/auth/session";
import { db, hifzLogs, hifzParas, students } from "@/lib/db";
import { canMarkSection, dhakaDate } from "@/lib/institute/attendance-queries";
import type { HifzRating } from "./queries";

export type HifzResult = { ok: true } | { ok: false; error: string; field?: string };

const RATINGS: HifzRating[] = ["mumtaz", "jayyid_jiddan", "jayyid", "maqbul", "needs_work"];
const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

/** The student, if they're in the member's institute and a section the member may record. */
async function studentInScope(studentId: string) {
  const me = await assertInstituteMember("hifz:write");
  if (!me) return { ok: false as const, error: "Your role can't record hifz lessons." };
  const [st] = await db
    .select({ id: students.id, sectionId: students.sectionId })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.instituteId, me.active.instituteId)))
    .limit(1);
  if (!st) return { ok: false as const, error: "This student isn't in your institute." };
  const allowed = await canMarkSection({ instituteId: me.active.instituteId, memberId: me.active.memberId, role: me.active.role, sectionId: st.sectionId });
  if (!allowed) return { ok: false as const, error: "You're not assigned to this student's section." };
  return { ok: true as const, me, st };
}

/** Saves (or corrects) a student's lesson for a day. */
export async function saveHifzLog(studentId: string, date: string, form: FormData): Promise<HifzResult> {
  const scope = await studentInScope(studentId);
  if (!scope.ok) return { ok: false, error: scope.error };
  const { me } = scope;
  const today = dhakaDate(Date.now());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || date < dhakaDate(Date.now() - 7 * 86_400_000)) {
    return { ok: false, error: "Lessons can be recorded for today or the last 7 days." };
  }

  const get = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const paraRaw = toAsciiDigits(get("sabakPara"));
  const sabakPara = paraRaw ? Number(paraRaw) : null;
  const rating = (get("rating") || null) as HifzRating | null;
  const values = { sabak: get("sabak"), sabakPara, sabki: get("sabki"), dour: get("dour"), rating, note: get("note", 500) };

  if (sabakPara !== null && (!Number.isInteger(sabakPara) || sabakPara < 1 || sabakPara > 30)) return { ok: false, error: "Para must be between 1 and 30.", field: "sabakPara" };
  if (rating && !RATINGS.includes(rating)) return { ok: false, error: "Choose a rating.", field: "rating" };
  if (!values.sabak && !values.sabki && !values.dour) return { ok: false, error: "Write at least the sabak, sabki or dour.", field: "sabak" };

  await db
    .insert(hifzLogs)
    .values({ instituteId: me.active.instituteId, studentId, date, ...values, teacherId: me.id, teacherName: me.name })
    .onConflictDoUpdate({ target: [hifzLogs.studentId, hifzLogs.date], set: { ...values, teacherId: me.id, teacherName: me.name, updatedAt: new Date() } });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Marks a para as memorized (with today's date), or un-marks it. */
export async function setParaMemorized(studentId: string, para: number, memorized: boolean): Promise<HifzResult> {
  const scope = await studentInScope(studentId);
  if (!scope.ok) return { ok: false, error: scope.error };
  if (!Number.isInteger(para) || para < 1 || para > 30) return { ok: false, error: "Para must be between 1 and 30." };
  if (memorized) {
    await db
      .insert(hifzParas)
      .values({ studentId, para, completedOn: dhakaDate(Date.now()), markedBy: scope.me.id })
      .onConflictDoNothing();
  } else {
    await db.delete(hifzParas).where(and(eq(hifzParas.studentId, studentId), eq(hifzParas.para, para)));
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertInstituteMember } from "@/lib/auth/session";
import { db, mealLogs, students } from "@/lib/db";
import { dhakaDate } from "@/lib/institute/attendance-queries";

export type BoardingResult = { ok: true } | { ok: false; error: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

/** Adds a student to the boarding, or takes them out. */
export async function setBoarder(studentId: string, isBoarder: boolean): Promise<BoardingResult> {
  const me = await assertInstituteMember("boarding:write");
  if (!me) return { ok: false, error: "Your role can't change boarders." };
  if (!UUID.test(studentId)) return { ok: false, error: "Unknown student." };
  await db.update(students).set({ isBoarder }).where(and(eq(students.id, studentId), eq(students.instituteId, me.active.instituteId)));
  revalidatePath("/dashboard/boarding");
  return { ok: true };
}

/** Saves a day's meals for every boarder in one go. */
export async function saveMeals(date: string, entries: { studentId: string; breakfast: boolean; lunch: boolean; dinner: boolean }[]): Promise<BoardingResult> {
  const me = await assertInstituteMember("boarding:write");
  if (!me) return { ok: false, error: "Your role can't record meals." };
  const today = dhakaDate(Date.now());
  if (!DAY.test(date) || date > today || date < dhakaDate(Date.now() - 7 * 86_400_000)) return { ok: false, error: "Meals can be recorded for today or the last 7 days." };
  const ids = entries.map((e) => e.studentId).filter((id) => UUID.test(id));
  if (!ids.length) return { ok: false, error: "There are no boarders to record." };

  const valid = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.instituteId, me.active.instituteId), eq(students.isBoarder, true), inArray(students.id, ids)));
  const ok = new Set(valid.map((v) => v.id));
  const rows = entries.filter((e) => ok.has(e.studentId));
  if (!rows.length) return { ok: false, error: "None of these students are boarders." };

  await db
    .insert(mealLogs)
    .values(rows.map((e) => ({ instituteId: me.active.instituteId, studentId: e.studentId, date, breakfast: !!e.breakfast, lunch: !!e.lunch, dinner: !!e.dinner, markedBy: me.id })))
    .onConflictDoUpdate({
      target: [mealLogs.studentId, mealLogs.date],
      set: { breakfast: sql`excluded.breakfast`, lunch: sql`excluded.lunch`, dinner: sql`excluded.dinner`, markedBy: sql`excluded.marked_by`, updatedAt: new Date() },
    });
  revalidatePath("/dashboard/boarding");
  return { ok: true };
}

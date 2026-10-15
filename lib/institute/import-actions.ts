"use server";

import { and, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertInstituteMember } from "@/lib/auth/session";
import { classes, db, sections, students } from "@/lib/db";
import { IMPORT_MAX_ROWS, type ImportCommit, type ImportLine, type ImportPreview, type ImportRow } from "@/lib/import-types";
import { STUDY_GROUPS, type StudyGroup } from "@/lib/ui/labels";
import { BD_MOBILE, localMobile, toAsciiDigits } from "./rules";

/*
 * Bulk student import. The browser parses the CSV and sends the rows; both the preview and the real import run the
 * same checks here, so what the preview promised is what gets saved. Rows with problems are skipped, never half-saved.
 */

type Shift = "morning" | "day" | "evening";
const SHIFTS: Shift[] = ["morning", "day", "evening"];
const BATCH = 100;

interface Planned {
  line: number;
  error?: string;
  summary: string;
  values?: typeof students.$inferInsert;
}

const text = (r: ImportRow, k: string, max = 120) => (r[k] ?? "").trim().slice(0, max);
const key = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");

function parseGender(v: string): "male" | "female" | null {
  const g = key(v);
  if (["boy", "male", "m", "ছেলে", "পুরুষ"].includes(g)) return "male";
  if (["girl", "female", "f", "মেয়ে", "নারী"].includes(g)) return "female";
  return null;
}

/** YYYY-MM-DD, or DD/MM/YYYY and DD-MM-YYYY as people write them in Bangladesh. Null when not a real past date. */
function parseDate(v: string): string | null {
  const s = toAsciiDigits(v.trim());
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  const parts = iso ? [iso[1], iso[2], iso[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : null;
  if (!parts) return null;
  const [y, m, d] = parts;
  const out = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const parsed = new Date(`${out}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== out) return null;
  return out > new Date().toISOString().slice(0, 10) ? null : out;
}

async function planStudents(instituteId: string, rows: ImportRow[]): Promise<Planned[]> {
  const [classRows, sectionRows, active] = await Promise.all([
    db.select({ id: classes.id, name: classes.name }).from(classes).where(eq(classes.instituteId, instituteId)),
    db.select({ id: sections.id, classId: sections.classId, name: sections.name, shift: sections.shift, capacity: sections.capacity }).from(sections).where(eq(sections.instituteId, instituteId)),
    db
      .select({ name: students.name, phone: students.guardianPhone, classId: students.classId, sectionId: students.sectionId, roll: students.roll })
      .from(students)
      .where(and(eq(students.instituteId, instituteId), eq(students.status, "active"))),
  ]);

  const classByName = new Map(classRows.map((c) => [key(c.name), c]));
  const takenRolls = new Map<string, Set<number>>();
  const seatsUsed = new Map<string, number>();
  const duplicates = new Set<string>();
  for (const a of active) {
    (takenRolls.get(a.sectionId) ?? takenRolls.set(a.sectionId, new Set()).get(a.sectionId)!).add(a.roll);
    seatsUsed.set(a.sectionId, (seatsUsed.get(a.sectionId) ?? 0) + 1);
    duplicates.add(`${key(a.name)}|${a.phone}|${a.classId}`);
  }

  // Student IDs: two-digit year + the institute's next number, handed out in file order
  const prefix = String(new Date().getUTCFullYear()).slice(2);
  const codes = await db
    .select({ code: students.studentCode })
    .from(students)
    .where(and(eq(students.instituteId, instituteId), like(students.studentCode, `${prefix}%`)));
  let lastCode = codes.reduce((m, r) => Math.max(m, Number(r.code.slice(2)) || 0), 0);

  const nextRollIn = new Map<string, number>();
  const nextRoll = (sectionId: string) => {
    const taken = takenRolls.get(sectionId) ?? new Set<number>();
    let n = nextRollIn.get(sectionId) ?? Math.max(0, ...taken);
    do n++;
    while (taken.has(n));
    nextRollIn.set(sectionId, n);
    return n;
  };

  return rows.map((r, i): Planned => {
    const line = i + 2;
    const fail = (error: string): Planned => ({ line, error, summary: "" });

    const name = text(r, "name");
    if (!name) return fail("Student name is missing.");
    const gender = parseGender(text(r, "gender"));
    if (!gender) return fail('Gender must be "boy" or "girl".');
    const dobRaw = text(r, "dateOfBirth");
    const dateOfBirth = dobRaw ? parseDate(dobRaw) : null;
    if (dobRaw && !dateOfBirth) return fail("Date of birth must be a past date like 2012-03-15 or 15/03/2012.");

    const cls = classByName.get(key(text(r, "class")));
    if (!cls) return fail(`Class "${text(r, "class")}" isn't set up. Use the exact class name from Classes.`);
    const classSections = sectionRows.filter((s) => s.classId === cls.id);
    const sectionName = key(text(r, "section"));
    const shiftRaw = key(text(r, "shift"));
    if (shiftRaw && !SHIFTS.includes(shiftRaw as Shift)) return fail('Shift must be "morning", "day" or "evening".');
    let candidates = sectionName ? classSections.filter((s) => key(s.name) === sectionName) : classSections;
    if (shiftRaw) candidates = candidates.filter((s) => s.shift === shiftRaw);
    if (!candidates.length) return fail(sectionName ? `${cls.name} has no section "${text(r, "section")}"${shiftRaw ? ` in the ${shiftRaw} shift` : ""}.` : `${cls.name} has no sections yet.`);
    if (candidates.length > 1) return fail(sectionName ? `${cls.name} has several sections called ${text(r, "section")}. Add a shift column.` : `Choose the section: ${cls.name} has more than one.`);
    const section = candidates[0];

    const groupRaw = key(text(r, "group"));
    const group = (groupRaw ? (STUDY_GROUPS as readonly string[]).includes(groupRaw) : true) ? ((groupRaw || null) as StudyGroup | null) : undefined;
    if (group === undefined) return fail('Study group must be "science", "commerce" or "humanities", or empty.');

    const guardianName = text(r, "guardianName");
    if (!guardianName) return fail("Guardian name is missing.");
    const guardianPhone = localMobile(text(r, "guardianPhone", 30));
    if (!BD_MOBILE.test(guardianPhone)) return fail("Guardian mobile must be a Bangladeshi number like 01712345678.");

    const dupKey = `${key(name)}|${guardianPhone}|${cls.id}`;
    if (duplicates.has(dupKey)) return fail("A student with this name and guardian mobile is already in this class.");

    if (section.capacity && (seatsUsed.get(section.id) ?? 0) >= section.capacity) return fail(`${cls.name} section ${section.name} is full (${section.capacity} seats).`);

    const rollRaw = toAsciiDigits(text(r, "roll"));
    let roll: number;
    if (rollRaw) {
      roll = Number(rollRaw);
      if (!Number.isInteger(roll) || roll < 1) return fail("Roll must be a whole number, or empty.");
      if (takenRolls.get(section.id)?.has(roll)) return fail(`Roll ${roll} is already taken in ${cls.name} section ${section.name}.`);
    } else roll = nextRoll(section.id);

    // Row is good: reserve what it uses so later rows in the same file see it
    duplicates.add(dupKey);
    seatsUsed.set(section.id, (seatsUsed.get(section.id) ?? 0) + 1);
    (takenRolls.get(section.id) ?? takenRolls.set(section.id, new Set()).get(section.id)!).add(roll);
    const studentCode = `${prefix}${String(++lastCode).padStart(4, "0")}`;

    return {
      line,
      summary: `${name} · ${cls.name} ${section.name} · roll ${roll}${group ? ` · ${group}` : ""}`,
      values: {
        instituteId,
        studentCode,
        name,
        nameBn: text(r, "nameBn"),
        gender,
        dateOfBirth,
        classId: cls.id,
        sectionId: section.id,
        roll,
        studyGroup: group,
        guardianName,
        guardianRelation: text(r, "guardianRelation", 40),
        guardianPhone,
        address: text(r, "address", 300),
      },
    };
  });
}

function checkInput(rows: ImportRow[]): string | null {
  if (!Array.isArray(rows) || rows.length === 0) return "The file has no student rows.";
  if (rows.length > IMPORT_MAX_ROWS) return `A file can hold up to ${IMPORT_MAX_ROWS} students. Split it and import in parts.`;
  return null;
}

export async function previewStudentImport(rows: ImportRow[]): Promise<ImportPreview> {
  const me = await assertInstituteMember("students:write");
  if (!me) return { ok: false, error: "Your role can't add students." };
  const bad = checkInput(rows);
  if (bad) return { ok: false, error: bad };
  const plan = await planStudents(me.active.instituteId, rows);
  const lines: ImportLine[] = plan.map((p) => ({ line: p.line, ok: !p.error, message: p.error ?? p.summary }));
  return { ok: true, lines, valid: plan.filter((p) => !p.error).length };
}

export async function importStudents(rows: ImportRow[]): Promise<ImportCommit> {
  const me = await assertInstituteMember("students:write");
  if (!me) return { ok: false, error: "Your role can't add students." };
  const bad = checkInput(rows);
  if (bad) return { ok: false, error: bad };

  const plan = await planStudents(me.active.instituteId, rows);
  const good = plan.filter((p): p is Planned & { values: NonNullable<Planned["values"]> } => !p.error && !!p.values);
  let imported = 0;
  for (let i = 0; i < good.length; i += BATCH) {
    const batch = good.slice(i, i + BATCH);
    // A clash with a student saved in the meantime skips that row instead of failing the whole file
    const saved = await db.insert(students).values(batch.map((b) => b.values)).onConflictDoNothing().returning({ id: students.id });
    imported += saved.length;
  }
  for (const p of ["/dashboard", "/dashboard/students", "/dashboard/classes"]) revalidatePath(p);

  const skipped = rows.length - imported;
  return {
    ok: true,
    imported,
    skipped,
    message: imported
      ? `Added ${imported} ${imported === 1 ? "student" : "students"}${skipped ? `. ${skipped} ${skipped === 1 ? "row was" : "rows were"} skipped.` : "."}`
      : "No students were added.",
  };
}

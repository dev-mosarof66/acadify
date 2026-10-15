"use server";

import { eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertInstituteMember } from "@/lib/auth/session";
import { classes, db, subjects } from "@/lib/db";
import { toAsciiDigits } from "@/lib/institute/rules";
import { IMPORT_MAX_ROWS, type ImportCommit, type ImportPreview, type ImportRow } from "@/lib/import-types";
import { GROUP_LABELS, STUDY_GROUPS, type StudyGroup } from "@/lib/ui/labels";

/* Bulk subject import: same rules as the Subjects form, checked row by row. */

interface Planned {
  line: number;
  error?: string;
  summary: string;
  values?: typeof subjects.$inferInsert;
}

const text = (r: ImportRow, k: string, max = 60) => (r[k] ?? "").trim().slice(0, max);
const key = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");

async function planSubjects(instituteId: string, rows: ImportRow[]): Promise<Planned[]> {
  const [classRows, existing, lastOrder] = await Promise.all([
    db.select({ id: classes.id, name: classes.name }).from(classes).where(eq(classes.instituteId, instituteId)),
    db.select({ classId: subjects.classId, name: subjects.name, group: subjects.studyGroup }).from(subjects).where(eq(subjects.instituteId, instituteId)),
    db.select({ classId: subjects.classId, last: max(subjects.sortOrder) }).from(subjects).where(eq(subjects.instituteId, instituteId)).groupBy(subjects.classId),
  ]);
  const classByName = new Map(classRows.map((c) => [key(c.name), c]));
  const order = new Map(lastOrder.map((o) => [o.classId, o.last ?? -1]));
  // classId|name → groups already using it (null = common)
  const used = new Map<string, (StudyGroup | null)[]>();
  const add = (classId: string, name: string, group: StudyGroup | null) => {
    const k = `${classId}|${key(name)}`;
    used.set(k, [...(used.get(k) ?? []), group]);
  };
  for (const e of existing) add(e.classId, e.name, e.group);

  return rows.map((r, i): Planned => {
    const line = i + 2;
    const fail = (error: string): Planned => ({ line, error, summary: "" });

    const cls = classByName.get(key(text(r, "class")));
    if (!cls) return fail(`Class "${text(r, "class")}" isn't set up. Use the exact class name from Classes.`);
    const name = text(r, "subject");
    if (!name) return fail("Subject name is missing.");

    const groupRaw = key(text(r, "group"));
    const common = ["", "all", "common", "everyone"].includes(groupRaw);
    if (!common && !(STUDY_GROUPS as readonly string[]).includes(groupRaw)) return fail('Group must be "science", "commerce" or "humanities", or empty for a common subject.');
    const group = common ? null : (groupRaw as StudyGroup);

    const fullRaw = toAsciiDigits(text(r, "fullMarks"));
    const passRaw = toAsciiDigits(text(r, "passMarks"));
    const fullMarks = fullRaw ? Number(fullRaw) : 100;
    const passMarks = passRaw ? Number(passRaw) : 33;
    if (!Number.isInteger(fullMarks) || fullMarks < 1 || fullMarks > 1000) return fail("Full marks must be a whole number, e.g. 100.");
    if (!Number.isInteger(passMarks) || passMarks < 0 || passMarks > fullMarks) return fail("Pass marks must be between 0 and the full marks.");

    const same = used.get(`${cls.id}|${key(name)}`) ?? [];
    if (same.includes(group)) return fail(`${cls.name} already has ${name}${group ? ` for ${GROUP_LABELS[group]}` : ""}.`);
    if (same.includes(null) || (group === null && same.length > 0)) {
      return fail(`${name} already exists in ${cls.name} for ${group === null ? "a group" : "everyone"}. Use a different name.`);
    }

    add(cls.id, name, group);
    const sortOrder = (order.get(cls.id) ?? -1) + 1;
    order.set(cls.id, sortOrder);
    return {
      line,
      summary: `${name} · ${cls.name} · ${group ? `${GROUP_LABELS[group]} only` : "everyone"} · pass ${passMarks}/${fullMarks}`,
      values: { instituteId, classId: cls.id, name, nameBn: text(r, "nameBn"), fullMarks, passMarks, studyGroup: group, sortOrder },
    };
  });
}

function checkInput(rows: ImportRow[]): string | null {
  if (!Array.isArray(rows) || rows.length === 0) return "The file has no subject rows.";
  if (rows.length > IMPORT_MAX_ROWS) return `A file can hold up to ${IMPORT_MAX_ROWS} rows. Split it and import in parts.`;
  return null;
}

export async function previewSubjectImport(rows: ImportRow[]): Promise<ImportPreview> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return { ok: false, error: "Only the principal or institute admin can add subjects." };
  const bad = checkInput(rows);
  if (bad) return { ok: false, error: bad };
  const plan = await planSubjects(me.active.instituteId, rows);
  return { ok: true, lines: plan.map((p) => ({ line: p.line, ok: !p.error, message: p.error ?? p.summary })), valid: plan.filter((p) => !p.error).length };
}

export async function importSubjects(rows: ImportRow[]): Promise<ImportCommit> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return { ok: false, error: "Only the principal or institute admin can add subjects." };
  const bad = checkInput(rows);
  if (bad) return { ok: false, error: bad };

  const plan = await planSubjects(me.active.instituteId, rows);
  const good = plan.filter((p): p is Planned & { values: NonNullable<Planned["values"]> } => !p.error && !!p.values);
  let imported = 0;
  for (let i = 0; i < good.length; i += 100) {
    const saved = await db
      .insert(subjects)
      .values(good.slice(i, i + 100).map((g) => g.values))
      .onConflictDoNothing()
      .returning({ id: subjects.id });
    imported += saved.length;
  }
  revalidatePath("/dashboard", "layout");

  const skipped = rows.length - imported;
  return {
    ok: true,
    imported,
    skipped,
    message: imported ? `Added ${imported} ${imported === 1 ? "subject" : "subjects"}${skipped ? `. ${skipped} ${skipped === 1 ? "row was" : "rows were"} skipped.` : "."}` : "No subjects were added.",
  };
}

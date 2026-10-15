"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { marksAllSections } from "@/lib/institute/attendance-queries";
import { assertInstituteMember } from "@/lib/auth/session";
import { classes, db, lectureSheets, subjects } from "@/lib/db";
import { deleteObject, putObject } from "@/lib/files/storage";

export type SheetResult = { ok: true } | { ok: false; error: string; field?: string };

const TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadSheet(form: FormData): Promise<SheetResult> {
  const me = await assertInstituteMember("sheets:write");
  if (!me) return { ok: false, error: "Your role can't upload lecture sheets." };
  const instituteId = me.active.instituteId;
  const title = String(form.get("title") ?? "").trim().slice(0, 140);
  const classId = String(form.get("classId") ?? "");
  const subjectId = String(form.get("subjectId") ?? "") || null;
  const file = form.get("file");

  if (!title) return { ok: false, error: "Give the sheet a title.", field: "title" };
  const [cls] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.instituteId, instituteId))).limit(1);
  if (!cls) return { ok: false, error: "Choose the class.", field: "classId" };
  if (subjectId) {
    const [sub] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.classId, classId))).limit(1);
    if (!sub) return { ok: false, error: "That subject isn't taught in this class.", field: "subjectId" };
  }
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose the file.", field: "file" };
  const ext = TYPES[file.type];
  if (!ext) return { ok: false, error: "Use a PDF, Word, PowerPoint, JPG or PNG file.", field: "file" };
  if (file.size > MAX_BYTES) return { ok: false, error: "The file must be under 10 MB.", field: "file" };

  const key = `institutes/${instituteId}/sheets/${randomBytes(8).toString("hex")}.${ext}`;
  try {
    await putObject(key, await file.arrayBuffer(), file.type);
  } catch {
    return { ok: false, error: "The file couldn't be uploaded. Try again." };
  }
  await db.insert(lectureSheets).values({
    instituteId,
    classId,
    subjectId,
    title,
    fileKey: key,
    fileName: file.name.slice(0, 200),
    contentType: file.type,
    sizeBytes: file.size,
    uploadedBy: me.id,
    uploadedByName: me.name,
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Removes a sheet. Whoever uploaded it can, and so can the principal or institute admin. */
export async function deleteSheet(id: string): Promise<SheetResult> {
  const me = await assertInstituteMember("sheets:write");
  if (!me) return { ok: false, error: "Your role can't remove lecture sheets." };
  const [row] = await db
    .select({ key: lectureSheets.fileKey, uploadedBy: lectureSheets.uploadedBy })
    .from(lectureSheets)
    .where(and(eq(lectureSheets.id, id), eq(lectureSheets.instituteId, me.active.instituteId)))
    .limit(1);
  if (!row) return { ok: false, error: "This sheet no longer exists." };
  if (row.uploadedBy !== me.id && !marksAllSections(me.active.role)) return { ok: false, error: "Only the teacher who uploaded it, or the principal, can remove it." };
  await db.delete(lectureSheets).where(eq(lectureSheets.id, id));
  await deleteObject(row.key);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

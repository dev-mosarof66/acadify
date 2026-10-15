import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { classes, db, lectureSheets, subjects } from "@/lib/db";

export interface SheetRow {
  id: string;
  title: string;
  classId: string;
  className: string;
  subjectId: string | null;
  subjectName: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

/** The institute's lecture sheets, newest first (optionally only one class). */
export async function getSheets(instituteId: string, classId?: string): Promise<SheetRow[]> {
  const rows = await db
    .select({
      s: lectureSheets,
      className: classes.name,
      subjectName: subjects.name,
    })
    .from(lectureSheets)
    .innerJoin(classes, eq(lectureSheets.classId, classes.id))
    .leftJoin(subjects, eq(lectureSheets.subjectId, subjects.id))
    .where(and(eq(lectureSheets.instituteId, instituteId), classId ? eq(lectureSheets.classId, classId) : undefined))
    .orderBy(desc(lectureSheets.createdAt), asc(lectureSheets.title));
  return rows.map(({ s, className, subjectName }) => ({
    id: s.id,
    title: s.title,
    classId: s.classId,
    className,
    subjectId: s.subjectId,
    subjectName,
    fileName: s.fileName,
    contentType: s.contentType,
    sizeBytes: s.sizeBytes,
    uploadedBy: s.uploadedBy,
    uploadedByName: s.uploadedByName,
    createdAt: s.createdAt.toISOString(),
  }));
}

/** The file behind a sheet, only if it belongs to this institute. */
export async function getSheetFile(instituteId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select({ key: lectureSheets.fileKey, fileName: lectureSheets.fileName, classId: lectureSheets.classId })
    .from(lectureSheets)
    .where(and(eq(lectureSheets.id, id), eq(lectureSheets.instituteId, instituteId)))
    .limit(1);
  return row ?? null;
}

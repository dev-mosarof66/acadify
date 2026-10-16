import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

import { assertSuperAdmin } from "@/lib/auth/session";
import { createJob, uploadPath } from "@/lib/kb/jobs";
import { guessMeta } from "@/lib/kb/meta";
import { KB_UPLOADS_DIR } from "@/lib/kb/paths";

export const maxDuration = 300;

const MAX_BYTES = 300 * 1024 * 1024;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CLASS_LEVEL = /^\d{1,2}(-\d{1,2})?$/;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Super admin only: saves a textbook PDF and creates a job for it. Nothing is parsed (or billed) until the admin starts it. */
export async function POST(request: Request) {
  let viewer;
  try {
    viewer = await assertSuperAdmin();
  } catch {
    return fail("Not authorized", 403);
  }

  if (process.env.VERCEL) return fail("This server can't save files. Run the dashboard locally or on a server with a disk, then commit the kb/ folder.", 409);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES + 1024 * 1024) return fail("The PDF is larger than 300 MB.", 413);

  const form = await request.formData().catch(() => null);
  if (!form) return fail("Couldn't read the upload.");

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a PDF file.");
  if (file.size > MAX_BYTES) return fail("The PDF is larger than 300 MB.", 413);

  // Only the PDF is required. Anything left blank is worked out from the file name, and the language from the parsed text.
  const guess = guessMeta(file.name);
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const title = text("title") || guess.title;
  const subject = (text("subject") || guess.subject).toLowerCase();
  const classLevel = form.has("classLevel") && text("classLevel") === "" ? guess.classLevel : text("classLevel") || guess.classLevel;
  const language = text("language") && text("language") !== "auto" ? text("language") : guess.language;
  const editionYear = text("editionYear") ? Number(text("editionYear")) : null;
  const printedPageOffset = text("printedPageOffset") ? Number(text("printedPageOffset")) : 0;

  if (title.length < 3 || title.length > 200) return fail("The title must be 3 to 200 characters.");
  if (!SLUG.test(subject) || subject.length > 40) return fail("Subject must be a short key like physics or higher-math (letters, digits, hyphens).");
  if (classLevel && !CLASS_LEVEL.test(classLevel)) return fail("Class must look like 9-10 or 6, or be left blank.");
  if (language !== "bn" && language !== "en" && language !== "auto") return fail("Language must be Bangla, English or automatic.");
  if (editionYear !== null && (!Number.isInteger(editionYear) || editionYear < 2000 || editionYear > 2100)) return fail("Edition year looks wrong.");
  if (!Number.isInteger(printedPageOffset) || printedPageOffset < 0 || printedPageOffset > 500) return fail("Page offset must be a whole number from 0 to 500.");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return fail("That file is not a PDF.");

  let pageCount: number;
  try {
    pageCount = (await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true })).getPageCount();
  } catch {
    return fail("Couldn't read that PDF. It may be damaged or password protected.");
  }
  if (pageCount < 1) return fail("The PDF has no pages.");

  const id = randomUUID();
  await mkdir(KB_UPLOADS_DIR, { recursive: true });
  try {
    await writeFile(uploadPath(id), bytes);
    const job = await createJob(
      {
        meta: { title, subject, classLevel, language, editionYear, printedPageOffset },
        fileName: file.name.replace(/[^\w.\- ()ঀ-৿]/g, "_").slice(0, 120) || "book.pdf",
        sizeBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        pageCount,
        pageFrom: 1,
        pageTo: pageCount,
        tier: "agentic",
        createdByName: viewer.name,
      },
      id
    );
    return NextResponse.json({ job });
  } catch (err) {
    await rm(uploadPath(id), { force: true });
    return fail(err instanceof Error ? err.message : "Couldn't save the upload.", 500);
  }
}

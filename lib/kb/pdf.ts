import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

/** Copies pages `from`..`to` (1-based, inclusive) of a PDF into a new, smaller PDF. */
export async function cutPages(srcPath: string, from: number, to: number, destPath: string) {
  const src = await PDFDocument.load(await readFile(srcPath), { updateMetadata: false, ignoreEncryption: true });
  const out = await PDFDocument.create();
  const indices = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
  for (const page of await out.copyPages(src, indices)) out.addPage(page);
  await writeFile(destPath, await out.save());
}

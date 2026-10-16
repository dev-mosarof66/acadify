/**
 * The parser describes each figure in words ("drawing: ruler showing 7 mm") and returns the cropped
 * pictures separately, tagged with the page and position they came from. This pairs them up so a
 * figure passage can show its picture. Pure functions.
 */
import type { ChapterDraft } from "./mdtree";

export interface ParsedImage {
  filename: string;
  category: "embedded" | "layout" | "screenshot" | null;
  bbox?: { x: number; y: number; w: number; h: number } | null;
  url: string;
}

export interface PlacedImage {
  /** Name the file is saved under in the chapter's assets/ folder. */
  saveAs: string;
  source: ParsedImage;
}

const FIGURE_DESCRIPTION = /^(drawing|illustration|photo|photograph|image|diagram|chart|graph|picture):/i;
// Pictures smaller than this are icons and bullets, not figures.
const MIN_W = 60;
const MIN_H = 40;

/** The page (1-based, within the file that was parsed) an image came from, read from its name. */
export function imagePage(filename: string): number | null {
  const m = filename.match(/(?:^|[_-])p(?:age)?[_-]?(\d+)[_-]/i);
  return m ? Number(m[1]) : null;
}

/**
 * Gives each figure description on a page the next picture on that page, top to bottom.
 * `pageFrom` is the PDF page the parsed file started at. Returns the pictures that were used.
 */
export function attachImages(chapter: ChapterDraft, images: ParsedImage[], pageFrom: number): PlacedImage[] {
  const byPage = new Map<number, ParsedImage[]>();
  for (const img of images) {
    const rel = imagePage(img.filename);
    // table crops are shown as real tables, not as pictures
    if (rel === null || !img.bbox || img.bbox.w < MIN_W || img.bbox.h < MIN_H || /table/i.test(img.filename)) continue;
    const page = pageFrom + rel - 1;
    byPage.set(page, [...(byPage.get(page) ?? []), img]);
  }
  // Cropped figures ("layout") are the cleanest; fall back to embedded pictures when a page has none.
  for (const [page, list] of byPage) {
    const layout = list.filter((i) => i.category === "layout");
    const use = layout.length ? layout : list.filter((i) => i.category !== "screenshot");
    byPage.set(page, use.sort((a, b) => a.bbox!.y - b.bbox!.y || a.bbox!.x - b.bbox!.x));
  }

  const placed: PlacedImage[] = [];
  const next = new Map<number, number>();
  for (const topic of chapter.topics) {
    for (const p of topic.passages) {
      if (p.kind !== "figure" || !FIGURE_DESCRIPTION.test(p.body)) continue;
      const list = byPage.get(p.pdfPageStart) ?? [];
      const i = next.get(p.pdfPageStart) ?? 0;
      const img = list[i];
      if (!img) continue;
      next.set(p.pdfPageStart, i + 1);
      const saveAs = `p${p.pdfPageStart}-${img.filename.replace(/[^\w.\-]/g, "_")}`;
      p.image = saveAs;
      placed.push({ saveAs, source: img });
    }
  }
  return placed;
}

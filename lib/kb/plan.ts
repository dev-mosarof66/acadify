/**
 * Works out the chapter page ranges from the book's contents page, so a whole book can be uploaded
 * and parsed one chapter at a time. Pure functions over the parsed Markdown of the first pages.
 */
import { buildBookTree, normalizeDigits, type PageMarkdown } from "./mdtree";

export interface TocEntry {
  number: number;
  title: string;
  /** The page number printed in the book's contents. */
  printedPage: number;
}

export interface ChapterRange {
  number: number;
  title: string;
  pageFrom: number;
  pageTo: number;
}

export type PlanResult = { ok: true; chapters: ChapterRange[]; printedPageOffset: number } | { ok: false; error: string };

const BN_ORDINALS: Record<string, number> = {
  প্রথম: 1, দ্বিতীয়: 2, তৃতীয়: 3, চতুর্থ: 4, পঞ্চম: 5, ষষ্ঠ: 6, সপ্তম: 7,
  অষ্টম: 8, নবম: 9, দশম: 10, একাদশ: 11, দ্বাদশ: 12, ত্রয়োদশ: 13, চতুর্দশ: 14, পঞ্চদশ: 15,
};
const EN_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
};

const BN_ROW = new RegExp(`^(${Object.keys(BN_ORDINALS).join("|")})\\s+(.+?)\\s+([০-৯0-9]{1,3})$`);
const NUM_ROW = /^(?:chapter\s+)?(\d{1,2}|[০-৯]{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen)\s*[.):\-–]?\s+(.+?)\s+([০-৯0-9]{1,3})$/i;

/** Table rows and lines of a page as plain text, one entry per line. */
function pageRows(markdown: string): string[] {
  return markdown
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/t[hd]>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((l) =>
      l
        .replace(/\*\*/g, "")
        .replace(/^#+\s*/, "")
        .replace(/[|]/g, " ")
        .replace(/[.·…]{2,}/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

function entryOf(row: string): TocEntry | null {
  const bn = row.match(BN_ROW);
  if (bn) return { number: BN_ORDINALS[bn[1]], title: bn[2].trim(), printedPage: Number(normalizeDigits(bn[3])) };
  const num = row.match(NUM_ROW);
  if (num) {
    const raw = num[1].toLowerCase();
    const number = EN_NUMBERS[raw] ?? Number(normalizeDigits(raw));
    if (number) return { number, title: num[2].trim(), printedPage: Number(normalizeDigits(num[3])) };
  }
  return null;
}

/** The longest run 1, 2, 3, … with rising page numbers found on any single page, or [] when there is none. */
export function parseToc(pages: PageMarkdown[]): TocEntry[] {
  let best: TocEntry[] = [];
  for (const page of pages) {
    const run: TocEntry[] = [];
    for (const row of pageRows(page.markdown)) {
      const e = entryOf(row);
      if (!e || e.number !== run.length + 1) continue;
      if (run.length && e.printedPage <= run[run.length - 1].printedPage) continue;
      run.push(e);
    }
    if (run.length > best.length) best = run;
  }
  return best.length >= 3 ? best : [];
}

/**
 * `pages` are the first pages of the book, parsed. The page where chapter 1 actually opens, compared
 * with the page number the contents gives it, tells how many PDF pages come before the book's page 1.
 */
export function planChapters(pages: PageMarkdown[], pageCount: number): PlanResult {
  const toc = parseToc(pages);
  if (!toc.length) return { ok: false, error: "Couldn't find the contents page (a list of chapters with page numbers) in the first pages of the PDF." };

  const opener = buildBookTree(pages, { keepEmpty: true }).find((c) => c.number === toc[0].number);
  if (!opener) return { ok: false, error: "Found the contents page but not the page where the first chapter starts, so the page numbers can't be matched to the PDF." };

  const offset = opener.pdfPageStart - toc[0].printedPage;
  const chapters: ChapterRange[] = toc.map((e, i) => {
    const pageFrom = e.printedPage + offset;
    const next = toc[i + 1];
    return { number: e.number, title: e.title, pageFrom, pageTo: next ? next.printedPage + offset - 1 : pageCount };
  });
  if (chapters.some((c) => c.pageFrom < 1 || c.pageTo > pageCount || c.pageFrom > c.pageTo)) {
    return { ok: false, error: "The chapter pages in the contents don't fit this PDF. Check that it is the whole book." };
  }
  return { ok: true, chapters, printedPageOffset: offset };
}

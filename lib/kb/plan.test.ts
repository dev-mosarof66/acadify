import assert from "node:assert/strict";
import test from "node:test";

import { parseToc, planChapters } from "./plan";

const page = (number: number, markdown: string) => ({ number, markdown });

const tocTable = `## সূচিপত্র
<table><tr><th>অধ্যায়</th><th>শিরোনাম</th><th>পৃষ্ঠা</th></tr>
<tr><td>প্রথম</td><td>ভৌত রাশি এবং তাদের পরিমাপ</td><td>১</td></tr>
<tr><td>দ্বিতীয়</td><td>গতি</td><td>২৫</td></tr>
<tr><td>তৃতীয়</td><td>বল</td><td>৫৬</td></tr></table>`;

test("reads chapters and page numbers from a contents table", () => {
  assert.deepEqual(parseToc([page(5, tocTable)]), [
    { number: 1, title: "ভৌত রাশি এবং তাদের পরিমাপ", printedPage: 1 },
    { number: 2, title: "গতি", printedPage: 25 },
    { number: 3, title: "বল", printedPage: 56 },
  ]);
});

test("reads plain English contents lines with dot leaders", () => {
  const md = "Contents\n\nChapter 1 Physical Quantities ........ 1\nChapter 2 Motion ........ 20\n3. Force .......... 41\nNote 7 pages";
  assert.deepEqual(parseToc([page(3, md)]).map((e) => [e.number, e.printedPage]), [[1, 1], [2, 20], [3, 41]]);
});

test("ignores pages that don't look like a contents list", () => {
  assert.deepEqual(parseToc([page(2, "প্রথম অধ্যায় শুরু হয়েছে ৫\n\nসাধারণ লেখা।")]), []);
});

test("plans chapter ranges, using where chapter 1 really opens to find the page offset", () => {
  const pages = [page(5, tocTable), page(6, "## প্রথম অধ্যায়\n\n### ভৌত রাশি\n\nলেখা।")];
  const plan = planChapters(pages, 100);
  assert.ok(plan.ok);
  assert.equal(plan.printedPageOffset, 5);
  assert.deepEqual(plan.chapters.map((c) => [c.number, c.pageFrom, c.pageTo]), [[1, 6, 29], [2, 30, 60], [3, 61, 100]]);
});

test("explains why a plan can't be made", () => {
  const noToc = planChapters([page(1, "কিছু নেই")], 50);
  assert.ok(!noToc.ok && /contents page/.test(noToc.error));
  const noOpener = planChapters([page(5, tocTable)], 50);
  assert.ok(!noOpener.ok && /first chapter/.test(noOpener.error));
  const tooShort = planChapters([page(5, tocTable), page(6, "## প্রথম অধ্যায়\n\n### শিরোনাম")], 40);
  assert.ok(!tooShort.ok && /don't fit/.test(tooShort.error));
});

import { checkChapterEdit } from "./plan";

test("accepts a corrected chapter and tidies the name", () => {
  const r = checkChapterEdit({ title: "  স্থির   বিদ্যুৎ ", pageFrom: 275, pageTo: 302 }, 366);
  assert.deepEqual(r, { ok: true, value: { title: "স্থির বিদ্যুৎ", pageFrom: 275, pageTo: 302 } });
});

test("rejects names and page ranges that can't be right", () => {
  for (const bad of [
    { title: "   ", pageFrom: 1, pageTo: 5 },
    { title: "x".repeat(201), pageFrom: 1, pageTo: 5 },
    { title: "ক", pageFrom: 0, pageTo: 5 },
    { title: "ক", pageFrom: 10, pageTo: 367 },
    { title: "ক", pageFrom: 20, pageTo: 10 },
    { title: "ক", pageFrom: 1.5, pageTo: 5 },
  ]) {
    assert.equal(checkChapterEdit(bad, 366).ok, false, JSON.stringify(bad));
  }
});

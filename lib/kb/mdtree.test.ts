import assert from "node:assert/strict";
import test from "node:test";

import { buildBookTree, normalizeDigits, pageBlocks } from "./mdtree";

const page = (number: number, markdown: string) => ({ number, markdown });
const longProse = "এটি একটি দীর্ঘ সাধারণ অনুচ্ছেদ যা আর উদাহরণের অংশ নয় এবং পাঠ্যের স্বাভাবিক ব্যাখ্যা চলতে থাকে, তাই এটিকে সাধারণ লেখা হিসেবেই ধরতে হবে এখানে।";

test("normalizes Bangla digits", () => assert.equal(normalizeDigits("৪.১২"), "4.12"));

test("pageBlocks splits headings, paragraphs and multi-line tables, dropping icon lines", () => {
  const md = "## ১.১ শিরোনাম\n\nপ্রথম অনুচ্ছেদ।\n\nicon: target\n\n<table><tr><th>ক</th></tr>\n<tr><td>খ</td></tr></table>\n\nশেষ।";
  const blocks = pageBlocks(md);
  assert.deepEqual(blocks.map((b) => b.type), ["heading", "para", "table", "para"]);
  assert.ok(blocks[2].text.includes("<td>খ</td>"));
});

test("builds topics with sequential numbering, sub-sections, tables, formulas and exercises", () => {
  const [ch] = buildBookTree([
    page(6, "## প্রথম অধ্যায়\n\n### ভৌত রাশি\n\n#### **(Physical Quantities)**\n\nভূমিকার লেখা।"),
    page(7, "## এ অধ্যায় শেষে আমরা –\n\n* ব্যাখ্যা করতে পারব।"),
    page(8, "## ১.১ পদার্থবিজ্ঞান (Physics)\n\nপ্রথম কথা।\n\n## ১.২ পরিসর\n\n### ১.২.১ উপবিভাগ\n\nআইনস্টাইন $E = mc^2$ বের করেন।\n\n$v = u + at$"),
    page(9, "### টেবিল ১.০২: রাশি\n\n<table><tr><td>১</td></tr></table>\n\n## ৯.৫ ভুল নম্বর\n\nএটি নতুন টপিক নয়।\n\n## ১.৩ তৃতীয়\n\n### নিজে করো\n\nএকটি কাজ।\n\n### উদাহরণ\n\nএকটি উদাহরণ।"),
    page(10, "## নমুনা প্রশ্ন\n\n### বহুনির্বাচনি প্রশ্ন\n\n১. প্রশ্ন কী?"),
  ]);
  assert.equal(ch.number, 1);
  assert.equal(ch.title, "ভৌত রাশি");
  assert.equal(ch.englishTitle, "Physical Quantities");
  assert.deepEqual(ch.topics.map((t) => t.key), ["1.0", "1.1", "1.2", "1.3", "1.ex"]);
  assert.deepEqual(ch.topics[0].passages.map((p) => p.kind), ["text", "objective"]);

  const t12 = ch.topics[2].passages;
  assert.equal(t12[0].section, "১.২.১ উপবিভাগ");
  assert.deepEqual(t12[0].formulas, ["E = mc^2"]);
  assert.equal(t12[1].kind, "formula");
  assert.equal(t12[2].kind, "table");
  assert.equal(t12[2].caption, "টেবিল ১.০২: রাশি");
  // "৯.৫" is not chapter 1 / next number, so it stays inside 1.2 as a section label.
  assert.equal(t12[3].section, "৯.৫ ভুল নম্বর");

  assert.deepEqual(ch.topics[3].passages.map((p) => p.kind), ["activity", "example"]);
  assert.equal(ch.topics[4].passages[0].kind, "exercise");
  assert.equal(ch.topics[4].passages[0].pdfPageStart, 10);
});

test("a paragraph cut by a page break is merged and keeps both pages", () => {
  const [ch] = buildBookTree([
    page(6, "## প্রথম অধ্যায়\n\n### শিরোনাম"),
    page(8, "## ১.১ বিষয়\n\nবাক্যটি শেষ হয়নি এবং"),
    page(9, "পরের পাতায় শেষ হলো।\n\nনতুন অনুচ্ছেদ।"),
  ]);
  const p = ch.topics.find((t) => t.key === "1.1")!.passages;
  assert.equal(p.length, 2);
  assert.equal(p[0].body, "বাক্যটি শেষ হয়নি এবং পরের পাতায় শেষ হলো।");
  assert.equal(p[0].pdfPageStart, 8);
  assert.equal(p[0].pdfPageEnd, 9);
});

test("worked examples and activities end at the first unrelated paragraph; figures get their own kind", () => {
  const [ch] = buildBookTree([
    page(6, "## প্রথম অধ্যায়\n\n### শিরোনাম"),
    page(8, `## ১.১ বিষয়\n\n### উদাহরণ\n\n**প্রশ্ন :** দৈর্ঘ্য কত?\n\n**উত্তর:** ৭ মিমি।\n\ndrawing: ruler\n\n**চিত্র ১.১২ : স্কেল**\n\n${longProse}\n\n### নিজে করো\n\nএকটি কাজ করো এবং ফলাফল লেখো।\n\n(১) ভাঁজ করো।\n\n${longProse}`),
  ]);
  const kinds = ch.topics.find((t) => t.key === "1.1")!.passages.map((p) => p.kind);
  assert.deepEqual(kinds, ["example", "example", "figure", "figure", "text", "activity", "activity", "text"]);
});

test("finds several chapters in one book, in Bangla and English, and ignores pages before the first", () => {
  const bn = buildBookTree([
    page(1, "## সূচিপত্র\n\nঅধ্যায় ১ ... ৩"),
    page(6, "## প্রথম অধ্যায়\n\n### এক\n\n## ১.১ ক\n\nলেখা।"),
    page(9, "## দ্বিতীয় অধ্যায়\n\n### দুই\n\n## ২.১ খ\n\nলেখা।"),
  ]);
  assert.deepEqual(bn.map((c) => [c.number, c.title, c.pdfPageStart, c.pdfPageEnd]), [[1, "এক", 6, 6], [2, "দুই", 9, 9]]);

  const en = buildBookTree([
    page(3, "# Chapter One\n\n## Physical Quantities\n\n## 1.1 Physics\n\nSome text."),
    page(5, "# Chapter 2: Motion\n\n## 2.1 Rest and Motion\n\nMore text."),
  ]);
  assert.deepEqual(en.map((c) => [c.number, c.title]), [[1, "Physical Quantities"], [2, "Motion"]]);
  assert.deepEqual(en[1].topics.map((t) => t.key), ["2.0", "2.1"]);
});

test("when the chapter is known, a misread opener heading still starts it", () => {
  // "ত্রয়োদশ অধ্যায়" came back as "অয়োদশ অধ্যায়"
  const [ch, ...rest] = buildBookTree(
    [
      page(351, "## অয়োদশ অধ্যায়\n\n### তেজস্ক্রিয়তা ও ইলেকট্রনিকস\n\nভূমিকা।"),
      page(353, "## ১৩.১ তেজস্ক্রিয়তা (Radioactivity)\n\nলেখা।"),
    ],
    { expect: { number: 13, title: "পরিকল্পনার নাম" } }
  );
  assert.equal(rest.length, 0);
  assert.equal(ch.number, 13);
  assert.equal(ch.title, "তেজস্ক্রিয়তা ও ইলেকট্রনিকস");
  assert.equal(ch.pdfPageStart, 351);
  assert.deepEqual(ch.topics.map((t) => t.key), ["13.0", "13.1"]);
});

test("when the chapter is known but no opener heading exists, the pages still become that chapter", () => {
  const [ch] = buildBookTree([page(40, "## ২.১ প্রথম বিষয়\n\nলেখা।")], { expect: { number: 2, title: "গতি" } });
  assert.equal(ch.title, "গতি");
  assert.deepEqual(ch.topics.map((t) => t.key), ["2.0", "2.1"]);
});

test("a heading for a different chapter number inside the pages does not start a new chapter", () => {
  const found = buildBookTree([page(10, "## তৃতীয় অধ্যায়\n\n### শিরোনাম\n\nলেখা।\n\n## দ্বিতীয় অধ্যায়\n\nরেফারেন্স।")], { expect: { number: 3, title: "বল" } });
  assert.equal(found.length, 1);
  assert.equal(found[0].number, 3);
});

test("reads a maths-book opener (অধ্যায় ১), splits the bracketed English title, and keeps every exercise in N.ex", () => {
  const pages = [
    { number: 6, markdown: "## অধ্যায় ১\n\n### সেট ও ফাংশন (Set and Function)\n\nসেটের ধারণা।\n\n## অনুশীলনী ১.১\n\n১. প্রশ্ন এক।" },
    { number: 7, markdown: "## অনুশীলনী ১.২\n\n২. প্রশ্ন দুই।" },
  ];
  const [ch] = buildBookTree(pages);
  assert.equal(ch.number, 1);
  assert.equal(ch.title, "সেট ও ফাংশন");
  assert.equal(ch.englishTitle, "Set and Function");
  assert.equal(ch.topics.filter((t) => t.key === "1.ex").length, 1);
});

test("an unnumbered maths chapter becomes topics by English term, and lessons after an exercise are not exercises", () => {
  const pages = [
    {
      number: 6,
      markdown: [
        "## অধ্যায় ১", "### সেট ও ফাংশন (Set and Function)", "ভূমিকা।",
        "## সেট (Set)", "সেট হলো সংগ্রহ।",
        "## অনুশীলনী ১.১", "১. প্রশ্ন এক।",
        "## অস্বয় (Relation)", "অস্বয় হলো সম্পর্ক।",
        "## অনুশীলনী ১.২", "২. প্রশ্ন দুই।",
        "<hr/>",
      ].join("\n\n"),
    },
  ];
  const [ch] = buildBookTree(pages);
  assert.deepEqual(ch.topics.map((t) => t.key), ["1.0", "1.1", "1.ex", "1.2"]);
  const relation = ch.topics.find((t) => t.key === "1.2")!;
  assert.ok(relation.passages.every((p) => p.kind !== "exercise"));
  const ex = ch.topics.find((t) => t.key === "1.ex")!;
  assert.equal(ex.passages.filter((p) => p.kind === "exercise").length, 2);
  assert.ok(ch.topics.every((t) => t.passages.every((p) => !/<hr/.test(p.body))));
});

test("a hyphenated question-type heading starts the exercise topic", () => {
  const pages = [{ number: 6, markdown: "## প্রথম অধ্যায়\n\n### রসায়ন\n\n## ১.১ পরিচিতি\n\nপাঠ।\n\n## সংক্ষিপ্ত-উত্তর প্রশ্ন\n\n১. প্রশ্ন?" }];
  const [ch] = buildBookTree(pages);
  const ex = ch.topics.find((t) => t.key === "1.ex");
  assert.ok(ex && ex.passages.some((p) => p.kind === "exercise"));
});

test("section numbers with 4 misread as 8 still open the right topics", () => {
  const pages = [
    {
      number: 103,
      markdown: ["## চতুর্থ অধ্যায়", "### কাজ", "## ৮.১ কাজ (Work)", "লেখা এক।", "## 8.2 শক্তি (Energy)", "লেখা দুই।", "## ৮.৩ রূপ", "লেখা তিন।", "## 8.8 উৎস (Sources)", "লেখা চার।"].join("\n\n"),
    },
  ];
  const [ch] = buildBookTree(pages);
  assert.deepEqual(ch.topics.map((t) => t.key), ["4.0", "4.1", "4.2", "4.3", "4.4"]);
});

test("section numbers with 7 misread as 1 or 9 still follow the sequence", () => {
  const heads = ["২.১ এক", "২.২ দুই", "২.৩ তিন", "২.৪ চার", "২.৫ পাঁচ", "২.৬ ছয়", "২.১ সাত (Seven)", "২.৮ আট (Eight)"];
  const markdown = ["## দ্বিতীয় অধ্যায়", "### গতি", ...heads.flatMap((h) => [`## ${h}`, "লেখা।"])].join("\n\n");
  const [ch] = buildBookTree([{ number: 37, markdown }]);
  assert.deepEqual(ch.topics.map((t) => t.key), ["2.0", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8"]);
});

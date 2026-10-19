import assert from "node:assert/strict";
import test from "node:test";

import { classify, type AiRecord } from "./aiready";
import { buildChunks, buildExerciseItems, figureRefsOf, figuresWithPictures, type ChunkBook } from "./chunks";

const book: ChunkBook = { id: "physics-9-10-bn", subject: "physics", classLevel: "9-10", language: "bn", trust: "page-checked" };
let n = 0;
const rec = (kind: string, text: string, extra: Partial<AiRecord> = {}): AiRecord => ({
  id: `physics-9-10-bn-c01-t1.1-p${String(++n).padStart(3, "0")}`,
  chapter: 1,
  chapterTitle: "গতি",
  topic: "1.1",
  topicTitle: "বেগ",
  section: null,
  kind,
  page: 10,
  text,
  image: null,
  verified: true,
  reviewReasons: [],
  ...extra,
});
const long = (s: string) => `${s} ${"শব্দ ".repeat(60)}`.trim();

test("fragments are regrouped: a lead-in and its formula stay together", () => {
  const chunks = buildChunks([rec("text", long("বেগ হলো সরণ ও সময়ের অনুপাত।")), rec("text", "কাজেই"), rec("formula", "$$v = \\frac{s}{t}$$"), rec("text", long("এর একক মিটার প্রতি সেকেন্ড।"))], book);
  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].text.includes("কাজেই\n\n$$v"));
  assert.ok(chunks[0].hasFormula);
});

test("a chunk never ends on a lead-in; it moves to the next chunk", () => {
  const recs = [rec("text", long("প্রথম অনুচ্ছেদ।").repeat(3)), rec("text", "এখন আমরা দেখব:"), rec("text", long("পরের অনুচ্ছেদ।").repeat(3))];
  const chunks = buildChunks(recs, book);
  for (const c of chunks) assert.ok(!/[:：]\s*$/.test(c.text), c.text.slice(-30));
});

test("a worked example is kept in one chunk", () => {
  const chunks = buildChunks(
    [rec("text", long("ভূমিকা পাঠ।").repeat(2)), rec("example", "**প্রশ্ন:** একটি গাড়ি ১০ সেকেন্ডে ১০০ মিটার যায়।"), rec("example", "**উত্তর:** বেগ = ১০ মি/সে।"), rec("formula", "$$v = 10$$"), rec("text", long("এবার পরের বিষয়।"))],
    book,
  );
  const ex = chunks.find((c) => c.hasExample)!;
  assert.ok(ex.text.includes("প্রশ্ন") && ex.text.includes("উত্তর") && ex.text.includes("$$v = 10$$"));
});

test("a caption-only chunk is dropped, a table stays whole", () => {
  const chunks = buildChunks([rec("text", long("প্রথম পাঠ।")), rec("table", "ক | খ\n১ | ২"), rec("figure", "চিত্র ১.১৩: একটি ব্লক।")], book);
  assert.ok(chunks.every((c) => !(c.kinds.length === 1 && c.kinds[0] === "figure")));
  assert.ok(chunks.some((c) => c.text.includes("ক | খ\n১ | ২")));
});

test("figures the text points to are flagged when their picture is missing", () => {
  // the picture hangs on the parser's description; the caption with the number is the passage after it
  const have = figuresWithPictures([
    { kind: "figure", body: "drawing: a ruler", image: "a.jpg" },
    { kind: "figure", body: "**চিত্র ১.০১: ছবি।**" },
    { kind: "text", body: "অন্য কিছু" },
    { kind: "figure", body: "চিত্র ১.০৩: ছবি ছাড়া।" },
  ]);
  assert.deepEqual([...have], ["1.01"]);
  const chunks = buildChunks([rec("text", long("চিত্র ১.০১ এবং চিত্র ১.০২ দেখো।"))], book, have);
  assert.deepEqual(chunks[0].figureRefs.sort(), ["1.01", "1.02"]);
  assert.deepEqual(chunks[0].missingFigures, ["1.02"]);
  assert.deepEqual(figureRefsOf("চিত্র ৪.০১ ও চিত্র 4-02"), ["4.01", "4.02"]);
});

test("exercise lines become whole items, typed, and bare instructions are dropped", () => {
  const items = buildExerciseItems(
    [
      rec("exercise", "সঠিক উত্তরটির পাশে টিক চিহ্ন দাও:"),
      rec("exercise", "১. কোয়ান্টাম তত্ত্ব প্রথম কে প্রদান করেন?"),
      rec("exercise", "(ক) প্ল্যাঙ্ক"),
      rec("exercise", "(খ) আইনস্টাইন"),
      rec("exercise", "(গ) রাদারফোর্ড"),
      rec("exercise", "(ঘ) হাইজেনবার্গ"),
      rec("exercise", `২. ${"একটি গাড়ি রাস্তায় চলছে। ".repeat(8)}`),
      rec("exercise", "(ক) বেগ কাকে বলে?"),
      rec("exercise", "(খ) ত্বরণ ব্যাখ্যা করো।"),
      rec("exercise", "(গ) গাড়ির গড় বেগ নির্ণয় করো।"),
      rec("exercise", "(ঘ) গাড়িটির গতি বিশ্লেষণ করো।"),
    ],
    book,
  );
  assert.equal(items.length, 2);
  assert.equal(items[0].type, "mcq");
  assert.ok(items[0].text.includes("(ঘ) হাইজেনবার্গ"));
  assert.equal(items[1].type, "cq");
});

test("a page-checked book releases passages held only for Latin unit words; foreign script stays held", () => {
  const p = { id: "x", kind: "text", section: null, caption: null, body: "1 km = 1000 m", reviewReasons: ["latin-junk"], printedPageStart: 1 };
  assert.equal(classify(p, undefined, {}).state, "held");
  assert.equal(classify(p, undefined, { pageChecked: true }).state, "included");
  assert.equal(classify({ ...p, reviewReasons: ["latin-junk", "foreign-script"] }, undefined, { pageChecked: true }).state, "held");
});

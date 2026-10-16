import assert from "node:assert/strict";
import test from "node:test";

import { buildAiReady, classify, cleanText, isFigureDescription, tableToText, type AiPassage } from "./aiready";

const p = (id: string, kind: string, body: string, reviewReasons: string[] = []): AiPassage => ({ id, kind, section: null, caption: null, body, reviewReasons, printedPageStart: 3 });

test("tells the parser's picture descriptions from the book's captions", () => {
  assert.ok(isFigureDescription("drawing: a ruler showing 7 mm"));
  assert.ok(isFigureDescription("Photo: stopwatch"));
  assert.ok(!isFigureDescription("**চিত্র ১.১২ : স্কেলের পাশে বস্তুটির দৈর্ঘ্য**"));
});

test("leaves out what is not content, sets exercises apart, and holds back likely errors", () => {
  assert.equal(classify(p("a", "text", "বাক্য।")).state, "included");
  assert.equal(classify(p("b", "figure", "drawing: a ruler")).state, "excluded");
  assert.equal(classify(p("c", "figure", "**চিত্র ১.১ : স্কেল**")).state, "included");
  assert.equal(classify(p("d", "objective", "* ব্যাখ্যা করতে পারব।")).state, "excluded");
  assert.equal(classify(p("e", "exercise", "১. প্রশ্ন?")).state, "exercise");
  assert.equal(classify(p("f", "text", "বাক্য PSS।", ["latin-junk"])).state, "held");
  // formulas and tables are included, just marked unverified
  assert.equal(classify(p("g", "formula", "$E=mc^2$", ["verify-formula"])).state, "included");
  assert.equal(classify(p("h", "text", "শক্তি", ["known-confusable-corrected"])).state, "included");
});

test("a reviewer's decision overrides the automatic one", () => {
  const junk = p("a", "text", "বাক্য PSS।", ["latin-junk"]);
  assert.equal(classify(junk, { status: "kept", original: junk.body }).state, "included");
  assert.equal(classify(p("b", "text", "ভালো বাক্য।"), { status: "excluded", original: "ভালো বাক্য।" }).state, "excluded");
  assert.equal(classify(p("c", "exercise", "প্রশ্ন?"), { status: "excluded", original: "প্রশ্ন?" }).state, "excluded");
});

test("turns tables into rows and strips markup", () => {
  assert.equal(tableToText("<table><tr><th>রাশি</th><th>একক</th></tr><tr><td>দৈর্ঘ্য</td><td>m<sup>2</sup></td></tr></table>"), "রাশি | একক\nদৈর্ঘ্য | m2");
  assert.equal(cleanText("text", "**প্রশ্ন :**   কত?"), "প্রশ্ন : কত?");
  assert.equal(cleanText("formula", "$v = u + at$"), "$v = u + at$");
});

test("builds the AI-ready copy with ids, pages and a report", () => {
  const edited = { ...p("t3", "text", "ভুল শব্দ PSS।", ["latin-junk"]), curation: { status: "kept" as const, body: "ঠিক শব্দ।", original: "ভুল শব্দ PSS।" } };
  const r = buildAiReady({
    number: 1,
    title: "ভৌত রাশি",
    topics: [
      { key: "1.1", title: "পদার্থবিজ্ঞান", passages: [p("t1", "text", "বাক্য।"), p("t2", "figure", "drawing: ruler"), edited, p("t4", "text", "অন্য PSS।", ["latin-junk"])] },
      { key: "1.ex", title: "নমুনা প্রশ্ন", passages: [p("q1", "exercise", "**১.** প্রশ্ন?")] },
    ],
  });
  assert.deepEqual(r.records.map((x) => [x.id, x.text, x.verified]), [["t1", "বাক্য।", true], ["t3", "ঠিক শব্দ।", true]]);
  assert.deepEqual(r.exercises.map((x) => x.text), ["১. প্রশ্ন?"]);
  assert.deepEqual({ ...r.report, reasons: undefined }, { included: 2, held: 1, excluded: 1, exercises: 1, reasons: undefined });
  assert.equal(r.report.reasons["picture description written by the parser"], 1);
  assert.equal(r.records[0].page, 3);
});

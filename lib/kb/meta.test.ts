import assert from "node:assert/strict";
import test from "node:test";

import { detectLanguage, guessMeta } from "./meta";

test("guesses subject and language from the file name", () => {
  assert.deepEqual(guessMeta("Physics_Bangla_Version.pdf"), { title: "Physics Bangla Version", subject: "physics", classLevel: "", language: "bn" });
  assert.equal(guessMeta("Higher_Math_English_Version.pdf").subject, "higher-math");
  assert.equal(guessMeta("Higher_Math_English_Version.pdf").language, "en");
  assert.deepEqual(guessMeta("Chemistry Class 9-10.pdf"), { title: "Chemistry Class 9-10", subject: "chemistry", classLevel: "9-10", language: "auto" });
  assert.equal(guessMeta("class_6_science.pdf").classLevel, "6");
  assert.equal(guessMeta("2025.pdf").subject, "book");
});

test("detects Bangla vs English from the text", () => {
  assert.equal(detectLanguage("পদার্থবিজ্ঞান একটি শাখা (Physics)"), "bn");
  assert.equal(detectLanguage("Physics is a branch of science."), "en");
});

import { detectClassLevel, detectEditionYear } from "./meta";

test("detects the class band from Bangla and English cover text", () => {
  assert.equal(detectClassLevel("পদার্থবিজ্ঞান\nনবম-দশম শ্রেণি"), "9-10");
  assert.equal(detectClassLevel("পদার্থবিজ্ঞান ৯ম-১০ম শ্রেণি"), "9-10");
  assert.equal(detectClassLevel("পদার্থবিজ্ঞান\n\n#### নবম ও দশম শ্রেণি"), "9-10");
  assert.equal(detectClassLevel("নির্ধারিত নবম ও দশম শ্রেণির পাঠ্যপুস্তকরূপে"), "9-10");
  assert.equal(detectClassLevel("ষষ্ঠ শ্রেণি বিজ্ঞান"), "6");
  assert.equal(detectClassLevel("Physics, Class 9-10"), "9-10");
  assert.equal(detectClassLevel("Mathematics for Class Nine-Ten"), "9-10");
  assert.equal(detectClassLevel("Class IX–X English"), "9-10");
  assert.equal(detectClassLevel("একশ্রেণির মৌলিক কণা, Class 40 pupils"), "");
  assert.equal(detectClassLevel("কোনো শ্রেণি নেই"), "");
});

test("reads the edition year from the cover", () => {
  assert.equal(detectEditionYear("**২০২৬ শিক্ষাবর্ষের জন্য পরিমার্জিত**"), 2026);
  assert.equal(detectEditionYear("২০১৩ শিক্ষাবর্ষ থেকে নবম ও দশম শ্রেণির পাঠ্যপুস্তক"), null);
});

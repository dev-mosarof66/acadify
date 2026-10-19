import assert from "node:assert/strict";
import test from "node:test";

import { kbClassFor, kbSubjectFor, parseChapterNumbers, textbookFor } from "./textbook";

test("subjects are recognised in English and Bangla, and unknown ones are left alone", () => {
  assert.equal(kbSubjectFor("Physics"), "physics");
  assert.equal(kbSubjectFor("পদার্থবিজ্ঞান"), "physics");
  assert.equal(kbSubjectFor("Chemistry (Science)"), "chemistry");
  assert.equal(kbSubjectFor("রসায়ন"), "chemistry");
  assert.equal(kbSubjectFor("Higher Math"), "higher-math");
  assert.equal(kbSubjectFor("উচ্চতর গণিত"), "higher-math");
  assert.equal(kbSubjectFor("Mathematics"), null);
  assert.equal(kbSubjectFor("Biology"), null);
});

test("only Class 9 and 10 map to the SSC books", () => {
  for (const c of ["Class 9", "Class Nine", "নবম শ্রেণি", "দশম", "Class 10", "Grade 9 - A", "৯ম শ্রেণি", "Class 10 (Science)"]) assert.equal(kbClassFor(c), "9-10", c);
  for (const c of ["Class 8", "Class 6", "Class 11", "Class 12", "অষ্টম শ্রেণি", "Play"]) assert.equal(kbClassFor(c), null, c);
});

test("chapter numbers are read from the ways a teacher writes them", () => {
  assert.deepEqual(parseChapterNumbers("1, 2 and 3"), [1, 2, 3]);
  assert.deepEqual(parseChapterNumbers("Chapters 2-4"), [2, 3, 4]);
  assert.deepEqual(parseChapterNumbers("chapter 3: Newton's laws, and ch 6"), [3, 6]);
  assert.deepEqual(parseChapterNumbers("অধ্যায় ১ থেকে ৩"), [1, 2, 3]);
  assert.deepEqual(parseChapterNumbers("অধ্যায় ২ ও ৫"), [2, 5]);
  assert.deepEqual(parseChapterNumbers("৫"), [5]);
  assert.deepEqual(parseChapterNumbers("1 - 3, 7"), [1, 2, 3, 7]);
});

test("free text with no chapter numbers, or with other numbers in it, selects no chapters", () => {
  assert.deepEqual(parseChapterNumbers("Newton's laws and friction"), []);
  assert.deepEqual(parseChapterNumbers("Class 9 half-yearly, 2026 syllabus"), []);
  assert.deepEqual(parseChapterNumbers("গতি ও বল"), []);
  assert.deepEqual(parseChapterNumbers("chapter 99"), []);
});

test("a class or subject the knowledge base does not cover gets no textbook block and no complaint", async () => {
  assert.deepEqual(await textbookFor({ className: "Class 8", subjectName: "Physics", chapters: "1-3" }), { block: null });
  assert.deepEqual(await textbookFor({ className: "Class 9", subjectName: "Biology", chapters: "1-3" }), { block: null });
});

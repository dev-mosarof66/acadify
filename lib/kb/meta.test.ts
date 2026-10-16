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

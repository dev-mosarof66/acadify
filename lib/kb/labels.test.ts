import assert from "node:assert/strict";
import test from "node:test";

import { bookLabel, groupBooks, groupKey, subjectName, versionLabel } from "./labels";

const book = (subject: string, classLevel: string, language: string) => ({ subject, classLevel, language });

test("labels a class and version, with or without a class", () => {
  assert.equal(versionLabel(book("physics", "9-10", "bn")), "Class 9-10 · Bangla version");
  assert.equal(versionLabel(book("physics", "", "en")), "English version");
  assert.equal(subjectName("higher-math"), "Higher math");
  assert.equal(bookLabel(book("physics", "9-10", "bn")), "Physics · Class 9-10 · Bangla version");
});

test("groups subjects by class and version, classes in order", () => {
  const groups = groupBooks([book("physics", "9-10", "bn"), book("chemistry", "9-10", "bn"), book("physics", "6", "bn"), book("physics", "9-10", "en"), book("art", "", "bn")]);
  assert.deepEqual(groups.map((g) => [g.key, g.books.map((b) => b.subject)]), [
    ["6/bn", ["physics"]],
    ["9-10/bn", ["chemistry", "physics"]],
    ["9-10/en", ["physics"]],
    ["all/bn", ["art"]],
  ]);
  assert.equal(groupKey(book("x", "", "bn")), "all/bn");
});

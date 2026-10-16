import assert from "node:assert/strict";
import test from "node:test";

import { chaptersToSubmit, isIdle, needsWork } from "./queue";

const ch = (number: number, status: string) => ({ number, status });

test("hands queued chapters to the parser two at a time", () => {
  assert.deepEqual(chaptersToSubmit([ch(1, "queued"), ch(2, "queued"), ch(3, "queued")]), [1, 2]);
  assert.deepEqual(chaptersToSubmit([ch(1, "parsing"), ch(2, "queued"), ch(3, "queued")]), [2]);
  assert.deepEqual(chaptersToSubmit([ch(1, "parsing"), ch(2, "parsing"), ch(3, "queued")]), []);
  assert.deepEqual(chaptersToSubmit([ch(1, "done"), ch(2, "pending"), ch(3, "failed")]), []);
});

test("knows when a job still needs the worker", () => {
  assert.ok(needsWork({ status: "planning", chapters: [] }));
  assert.ok(needsWork({ status: "uploaded", chapters: [] }));
  assert.ok(needsWork({ status: "planned", chapters: [ch(1, "queued")] }));
  assert.ok(needsWork({ status: "planned", chapters: [ch(1, "done"), ch(2, "parsing")] }));
  assert.ok(!needsWork({ status: "planned", chapters: [ch(1, "done"), ch(2, "pending"), ch(3, "failed")] }));
  assert.ok(!needsWork({ status: "failed", chapters: [] }));
});

test("idle means unchanged for longer than the limit", () => {
  const now = Date.parse("2026-10-16T12:00:00Z");
  assert.ok(isIdle("2026-10-16T11:49:00Z", 10 * 60_000, now));
  assert.ok(!isIdle("2026-10-16T11:55:00Z", 10 * 60_000, now));
});

import assert from "node:assert/strict";
import test from "node:test";

import { attachImages, imagePage, type ParsedImage } from "./images";
import { buildBookTree } from "./mdtree";

const img = (filename: string, category: ParsedImage["category"], y: number, w = 150, h = 80): ParsedImage => ({ filename, category, bbox: { x: 10, y, w, h }, url: `https://example.test/${filename}` });

test("reads the page from image file names", () => {
  assert.equal(imagePage("img_p1_2.jpg"), 1);
  assert.equal(imagePage("page_12_image_3_v2.jpg"), 12);
  assert.equal(imagePage("logo.png"), null);
});

test("pairs figure descriptions with pictures on the same page, top to bottom, skipping icons", () => {
  const [ch] = buildBookTree([
    { number: 30, markdown: "## প্রথম অধ্যায়\n\n### শিরোনাম" },
    { number: 31, markdown: "## ১.১ বিষয়\n\ndrawing: a ruler\n\n**চিত্র ১.১ : স্কেল**\n\ndrawing: a balance\n\nলেখা।" },
  ]);
  const placed = attachImages(
    ch,
    [
      img("page_2_image_2_v2.jpg", "layout", 400), // second figure, lower on the page
      img("page_2_image_1_v2.jpg", "layout", 100), // first figure
      img("img_p2_1.jpg", "embedded", 50, 38, 38), // icon
      img("page_9_image_1_v2.jpg", "layout", 10), // another page
    ],
    30
  );
  const figures = ch.topics.flatMap((t) => t.passages).filter((p) => p.kind === "figure");
  assert.equal(figures[0].image, "p31-page_2_image_1_v2.jpg"); // the first description
  assert.equal(figures[1].image, null); // the caption "চিত্র ১.১" gets no picture of its own
  assert.equal(figures[2].image, "p31-page_2_image_2_v2.jpg");
  assert.equal(placed.length, 2);
});

test("table crops are not used as pictures", () => {
  const [ch] = buildBookTree([
    { number: 30, markdown: "## প্রথম অধ্যায়\n\n### শিরোনাম" },
    { number: 31, markdown: "## ১.১ বিষয়\n\ndrawing: a ruler\n\nলেখা।" },
  ]);
  const placed = attachImages(ch, [img("page_2_table_1_v2.jpg", "layout", 100)], 30);
  assert.equal(placed.length, 0);
});

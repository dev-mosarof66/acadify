import assert from "node:assert/strict";
import test from "node:test";

import { applyCorrections, hasLatinJunk } from "./review";

test("chemical formulas and ions are not stray Latin letters", () => {
  assert.equal(hasLatinJunk("1g H<sub>2</sub>SO<sub>4</sub> এ কতগুলো অণু আছে?"), false);
  assert.equal(hasLatinJunk("OH<sup>-</sup> আয়ন ও Ca(OH)<sub>2</sub> ক্ষার।"), false);
});

test("real stray Latin words are still held", () => {
  assert.equal(hasLatinJunk("বাক্য PSS।"), true);
});

test("fixes the misread base/alkali word", () => {
  assert.equal(applyCorrections("এসিড-স্ফারক সমতা").text, "এসিড-ক্ষারক সমতা");
});

test("fixes the misread periodic-table words", () => {
  assert.equal(applyCorrections("পর্দায় সারণির সুবিধা ও আধুনিক পার্যায় সারণি").text, "পর্যায় সারণির সুবিধা ও আধুনিক পর্যায় সারণি");
});

test("fixes the ক্ষ conjunct the parser reads as স্ফ or স্ক, in any inflection", () => {
  assert.equal(applyCorrections("এসিড-স্ফারক সমতা").text, "এসিড-ক্ষারক সমতা");
  assert.equal(applyCorrections("স্ফারককে ও স্ফারীয় দ্রবণ, অম্ল-স্ফার").text, "ক্ষারককে ও ক্ষারীয় দ্রবণ, অম্ল-ক্ষার");
  assert.equal(applyCorrections("স্কুদ্রতম সংখ্যা এবং স্কুন্দ অণুজীব").text, "ক্ষুদ্রতম সংখ্যা এবং ক্ষুদ্র অণুজীব");
  // a real word that starts the same way is left alone
  assert.equal(applyCorrections("স্ফারিত চোখ").text, "স্ফারিত চোখ");
});

test("fixes মৃৎক্ষার ধাতু in each misread spelling", () => {
  assert.equal(applyCorrections("মুৎস্ফার ধাতু ও মূংস্ফার ধাতু").text, "মৃৎক্ষার ধাতু ও মৃৎক্ষার ধাতু");
});

import { bengalify, hasForeignScript, reviewReasons } from "./review";

test("converts Bangla words the parser wrote in Devanagari or Gujarati letters back to Bangla", () => {
  assert.equal(bengalify("দুইয়ের अधिक মৌল"), "দুইয়ের অধিক মৌল");
  assert.equal(bengalify("ইলেকট্রন त्याग করে ধनাत्मক সংখ্যা"), "ইলেকট্রন ত্যাগ করে ধনাত্মক সংখ্যা");
  assert.equal(bengalify("চित्र ৮.০২ ও बहुনির্বাচনি"), "চিত্র ৮.০২ ও বহুনির্বাচনি");
  assert.equal(bengalify("মাपা হয়। তোমরা"), "মাপা হয়। তোমরা"); // the danda is Bangla's full stop and must survive
  assert.equal(bengalify("বिষय ও বलय"), "বিষয় ও বলয়");
  assert.equal(bengalify("সংযোগ ও ব্যবহার"), "সংযোগ ও ব্যবহার");
  assert.equal(bengalify("অপરિবাহী"), "অপরিবাহী");
});

test("converts the Tamil words the parser used, and holds anything else foreign", () => {
  // the neon case is Bangla ন + Tamil ி য + Bangla ন; அதிக is wholly Tamil
  assert.equal(applyCorrections("গ্যাস নியন ও அதிக পরিমাণ").text, "গ্যাস নিয়ন ও অধিক পরিমাণ");
  assert.equal(applyCorrections("আলমিরா").text, "আলমিরা");
  assert.equal(hasForeignScript("এখানে ஐ আছে"), true);
  assert.equal(hasForeignScript("শেষ হলো। λ ও θ বিজ্ঞানে"), false);
  assert.ok(reviewReasons({ kind: "text", body: "এখানে ஐ আছে", formulas: [] }, false).includes("foreign-script"));
});

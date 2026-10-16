# Extraction findings: Class 9-10 (SSC) books

Date: 2026-10-16. Source: `.books/Class 9-10 (SSC)/` (6 PDFs, 461 MB).
Method: pdf.js text-layer probe on 14 sampled pages per book, 5 pages rendered and viewed, 1 page OCR'd.

## Books

| Book | Pages | Text layer |
|---|---|---|
| Physics, English | 366 | 1 of 14 sampled pages had text (p150) |
| Physics, Bangla | 366 | 0 of 14 usable; p50 has legacy-encoded junk (`mgq ( ) ev‡` Ab¨`) |
| Chemistry, English | 310 | 0 of 14 |
| Chemistry, Bangla | 310 | 0 of 14 |
| Higher Math, English | 354 | 0 of 14 |
| Higher Math, Bangla | 342 | 0 of 14 |

Total about 2,040 pages. All six are image scans re-saved with iLovePDF.

## Conclusions

1. **OCR is required for every book.** Native text extraction (`src/extract.js`) is not usable. The few text-layer pages are unreliable, and Bangla ones use a legacy font encoding that must be ignored.
2. **Scan quality is good.** Rendered pages are clean and high-contrast, from the new competency-based curriculum (Physics 9-10 is "ফর্মা-৪, পদার্থবিজ্ঞান, ৯ম-১০ম শ্রেণি").
3. **Tesseract 5.4 with `ben` and `eng` is already installed** (`C:\Program Files\Tesseract-OCR`), as is poppler (`pdftoppm`). No new installs needed.
4. **Prose OCR is good, math is weak.** One Bangla physics page (200 dpi, `--psm 4`, `ben+eng`):
   - Body text and headings were read correctly, including `২.৭ গতির সমীকরণ (Equations of Motion)`.
   - Errors were in symbols and rare words: `v` became `৮`, `m/s²` became `m/s’`, `রৈখিক` became `ARS`.
   - Higher Math and Chemistry equations will be worse. Formula blocks need a separate path (flagged for review or a math-capable OCR/vision model).
5. **Speed:** about 6.5 s per page including startup, so roughly 3.5 hours for all 2,040 pages single-threaded. It parallelises per page.
6. **PDF page index is not the printed page number.** Physics Bangla index p30 prints as page ২৫. Citations must store both.

## Heading patterns seen (Physics, Bangla)

- Running header on every page: chapter title and printed page number (`ভৌত রাশি এবং তাদের পরিমাপ ... ২৫`). Must be stripped before structuring.
- Section headings: `২.৭ গতির সমীকরণ (Equations of Motion)`: Bangla digits, dotted number, title, optional English term in parentheses.
- Activity boxes: `অনুসন্ধান ১.০১`, tables `টেবিল ১.০৬:`. These are not section headings and need their own passage kind.
- Footer: `ফর্মা-৪, পদার্থবিজ্ঞান, ৯ম-১০ম শ্রেণি`, to be stripped.
- Section regex in `src/structure.js` (`N.N Title`) already matches the section pattern after digit normalisation. Chapter openers and the `অধ্যায়` keyword have not been seen yet and are unverified.

## Not verified yet

- Chapter opener pages (`অধ্যায়`/`Chapter` format), exercises and chemistry/math layouts. Only Physics Bangla was viewed closely; one Higher Math and one Chemistry page were rendered but not examined.
- Whether English and Bangla editions share identical chapter and section numbering (needed for `topic_key` linking).
- Edition year and curriculum version: not read from the files.
- Biology, General Math, English, ICT books are not in `.books/` yet.

## Next steps

1. Build an OCR stage: render with `pdftoppm`, run `tesseract -l ben+eng` (or `eng`), per-page output JSON with printed page number, concurrency 4-6.
2. Add header/footer stripping and page-label detection.
3. Run one chapter of Physics Bangla end to end and review the tree by eye before bulk OCR.

## OCR stage trial: Physics Bangla, Chapter 1 (PDF pages 6-36)

Built `src/ocr.js`, `src/clean.js`, `scripts/ocr.js`, `scripts/build-tree.js`. Output is cached per page in `data/` (git-ignored).

| Result | Value |
|---|---|
| Pages OCR'd | 32 (PDF 6-37) at 300 dpi, `ben+eng`, `--psm 4`, 4 workers |
| Time | 90 s (about 2.8 s/page); full 2,040 pages is roughly 1.5-2 hours |
| Chapter and sections found | Chapter 1 with sections 1.1-1.7, all correct |
| Passages | 214 (212 text, 1 activity, 1 example) |
| Flagged for OCR review | 31 passages (14%) contain a Bangla line with a stray all-caps Latin token |

Findings:

- **Dual-language OCR trade-off.** `ben` alone reads Bangla correctly but turns English terms into digits and symbols. `ben+eng` reads English correctly but sometimes turns a Bangla word into capitals (`COSA`, `AAT`). 300 dpi fixed most of these in headings; body text still has some.
- **Chapter title can be wrong.** The decorative chapter-opener font gave `Corse রাশি এবং তাদের পরিমাপ` instead of `ভৌত রাশি ...`. Titles should be taken from the table of contents page (PDF p5), which OCRs cleanly.
- **Section detection is now sequential.** A section number is accepted only if it carries the chapter number and the next sequence number. This removed false sections such as `2.04 চিত্রে ...` and `2.5 সেকেন্ডে ...`.
- **Printed page offset:** printed page = PDF page - 5 for this book. `clean.js` reads it from the running header.
- Not yet handled: exercises, math/formula blocks (`formula` kind never triggered), tables, figure captions as separate passages.

Next: take chapter titles from the TOC, add a second-pass fix for suspect lines, then OCR the remaining chapters of this book.

## Reconciliation pass (Physics Bangla, Chapter 1)

Three OCR passes per page (`ben+eng@300`, `ben@300`, `ben@200`), merged by `src/fixocr.js` via `scripts/fix-ocr.js`:

- Latin-only tokens outside parentheses in the mixed pass are replaced by the Bangla word from the `ben` pass at the same position (102 replacements; allow-list for SI, DC, etc.).
- Lines missing from the mixed pass but present in a `ben` pass are re-inserted (13 lines). Example: the sentence "পদার্থবিজ্ঞানের পরিসর অনেক বড়ো। … ব্যবহার করে" in 1.2 was dropped by both 300 dpi passes and recovered from the 200 dpi pass. It is now confirmed against the page image.
- Systematic fixes applied at export and recorded in `textbook.json`: `ভোত` to `ভৌত`, stray `|` to `।`.
- Each passage carries `reviewReasons` (`latin-junk`, `line-recovered-from-second-pass`, `word-auto-replaced`); 102 of 214 passages have none.

Known limits:

- Replacements are not verified. A real English word outside parentheses could be replaced by a ben-pass misreading, and recovered lines carry ben-pass spelling errors (e.g. `দীড়িয়েছে` for `দাঁড়িয়েছে`). All such passages are flagged for review.
- A line dropped by every pass at every resolution would not be detected.
- Table fragments and figure labels still enter as text passages.

## Conjunct (যুক্তবর্ণ) test: tessdata_best Bangla model

Downloaded `ben.traineddata` (10.5 MB) from `tesseract-ocr/tessdata_best` into `tessdata/` (git-ignored; `TESSDATA_DIR` env var selects it). Re-ran Physics Bangla pages 6-36 with all three passes. Counts over those 31 pages:

| Pattern | Old fast model | New best model |
|---|---|---|
| শত্তি (wrong, should be শক্তি) | 4 | 5 |
| যন্দ্র (wrong, should be যন্ত্র) | 2 | 1 |
| ক্ক (suspect, should usually be ক্ষ) | 3 | 3 |
| সৃক্ষ (wrong, should be সূক্ষ্ম) | 1 | 0 |
| ক্বমবিকাশ (wrong, should be ক্রমবিকাশ) | 1 | 1 |
| Output length (chars) | 44,981 | 47,674 |

Conclusion: the best model does not fix conjunct errors. The few improvements are offset by new errors.
- Page 12 test: 300, 450 and 600 dpi, `--psm 4` and `6` all gave the same result (1 wrong, 2 right), so resolution and layout mode do not help.
- The best model includes Latin glyphs, so `ben` and `ben+eng` now give nearly identical output and the reconcile step loses most of its second opinion.
- Tesseract is not accurate enough on Bangla conjuncts for exam-grade source text. A different engine is needed (vision model OCR), at least for verification.

## LiteParse trial (`@llamaindex/liteparse` 2.15.1)

Installed in the project; ran `lit parse ... --target-pages 12 --ocr-language ben --dpi 300` on Physics Bangla.

- The log lines ("Using params model of the primary language", "Detected N diacritics") are Tesseract's: LiteParse's built-in OCR is Tesseract, so the project cannot drop Tesseract by switching to LiteParse's default OCR.
- Page 12 result is the same as the Tesseract CLI: `শত্তি` 2 wrong / 1 right (CLI: 1 / 2), `ভোত` for `ভৌত`, junk token `ogo`; 1,490 characters versus 1,487. Output also pads words with wide runs of spaces.
- LiteParse helps with layout, tables and headers on text-layer PDFs; these books are scans, so it adds nothing here.
- LiteParse accepts `--ocr-server-url`, an HTTP OCR endpoint. That is the way to plug in a better engine (self-hosted EasyOCR/PaddleOCR, a cloud OCR service, or a small server that calls Claude vision) while keeping LiteParse for page handling.

## LlamaParse trial (agentic tier, Physics Bangla pages 6-36)

Cut PDF pages 6-36 into `data/llamaparse/ch1.pdf` (31 pages), uploaded once with `scripts/llamaparse.js` (tier `agentic`, OCR languages `bn`, `en`). Took 78 s. The API key comes from the repo-root `.env.local`.

Use the `markdown` field; the `text` field is unusable (garbage digits from the PDF's broken text layer).

| Pattern (31 pages) | Tesseract fast | Tesseract best | LlamaParse |
|---|---|---|---|
| শত্তি (wrong) | 4 | 5 | 0 |
| যন্দ্র (wrong) | 2 | 1 | 0 |
| ক্ক (suspect) | 3 | 3 | 0 |
| ক্বমবিকাশ (wrong) | 1 | 1 | 0 |
| ভোত (wrong, should be ভৌত) | 12 | 14 | 0 |
| শক্তি (right) | 16 | 16 | 22 |
| ক্ষ (right) | 71 | 80 | 91 |
| সূক্ষ্ম (right) | 0 | 0 | 14 |
| Dropped 1.2 sentence recovered | no | yes | yes |

- Every wrong conjunct form counted is gone, and correct forms went up. Bangla digits and the danda `।` are also read correctly.
- Not perfect: p12 still has `উথানপর্ব` for `উত্থানপর্ব` and `যোড়শ` for `ষোড়শ`. Some errors remain, so review flags are still needed.
- Tables come back as HTML (`<table><tr><td>`) and formulas as LaTeX (`\frac`, `\times`), which fits the `formula` and table passage kinds.
- Cost: not measured. Check the credits used in the LlamaCloud dashboard before running whole books.
- The earlier LiteParse trial output (`data/liteparse/`) was deleted at the user's request.

## Decision: LlamaParse replaces Tesseract (2026-10-16)

The pipeline now reads LlamaParse `markdown` (`src/mdtree.js`, `scripts/export-chapter.js`). The Tesseract and LiteParse code, the `tessdata/` models and all OCR caches were deleted from the project; the system Tesseract install was left alone. Chapter 1 re-exported to `kb/` (9 topics, 218 passages: 120 text, 23 figure, 15 activity, 6 table, 4 formula, 2 example, 47 exercise, 1 objective).

- One page (PDF p31, printed p26) was checked against the page image: text, the `(4.0 ± 0.5)cm` formula, the worked example and the figure caption match. One LlamaParse error was found there (`বস্তুরটির` for `বস্তুটির`), now in the correction list.
- Every correction in `CORRECTIONS` (export-chapter.js) was confirmed against a page image or a second OCR source. Passages touched by a correction carry `known-confusable-corrected`.
- Only one page has been compared by eye. Review the flagged passages and spot-check more pages before treating this as exam-grade source text.

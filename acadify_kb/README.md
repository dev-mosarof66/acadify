# acadify_kb

The curriculum knowledge base. `kb/` is the product: structured, citable textbook content that is committed and deployed with the app. Everything else here supports it.

First target: Class 9-10 core subjects. See `docs/PLAN.md` for the plan and `docs/EXTRACTION_FINDINGS.md` for what was tested and why LlamaParse replaced Tesseract.

## How a book gets in

Super admin dashboard: **Knowledge Base** (`/admin/knowledge-base`).

1. Press **Upload PDF** (top right) and pick the whole book. Nothing else is asked: the title, subject and language come from the file name and the parsed text.
2. The first 15 pages (the contents) are read automatically. That gives the chapter names and their page ranges, and the offset between the book's page numbers and the PDF's.
3. Parse chapters one at a time (**Parse**) or all of them (**Parse all**, two at a time). Each chapter is cut out of the PDF and parsed on its own, with its pictures, and uses LlamaParse credits per page.
4. When a chapter finishes it is structured and written to `kb/`. Click the chapter to read it in the dashboard (formulas rendered, pictures shown, review flags on each passage). **Rebuild (free)** redoes the structuring from the saved parser output.
5. Review the flagged passages, then commit `kb/`.

The code lives in the app: `lib/kb/` (pipeline), `app/api/admin/kb/` (upload and picture routes), `lib/kb/actions.ts` (buttons), `components/super-admin/kb-console.tsx` and `kb-chapter.tsx` (page). Tests: `npx tsx --test lib/kb/*.test.ts`.

Needs `LLAMA_CLOUD_API_KEY` in the server environment (`.env.local`) and a server with a writable disk (not Vercel). Set `KB_ROOT` to move this folder.

## Layout

```
kb/<subject>/class-<level>/<lang>/        committed, ships with the app
  textbook.json                           source file, sha256, extraction settings, corrections, page offset
  chapters/NN/chapter.json                title, page ranges, topic index, stats
  chapters/NN/topics/<key>.json           topic with passages (stable ids, kind, body, pdf + printed pages, reviewReasons)
  chapters/NN/chapter.md                  readable copy for review
  chapters/NN/assets/                     pictures cropped from the book, one per figure
data/                                     git-ignored: uploads, job state, raw parser pages
docs/                                     plan and findings
sql/schema.sql                            sketch of a future PostgreSQL import (not used yet)
src/chunk.js, src/generate.js             retrieval chunking and the grounded question prompt/validator (not wired yet)
```

Topic keys: `N.0` intro and learning outcomes, `N.M` numbered sections, `N.ex` sample questions.
Review reasons: `latin-junk`, `known-confusable-corrected`, `verify-formula`, `verify-table`.

## Status

Exported: Physics (Bangla) Chapter 1. Not built yet: indexing/retrieval over `kb/`, the question generator wired to an LLM, English editions, other books.

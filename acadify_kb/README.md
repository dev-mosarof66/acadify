# acadify_kb

The curriculum knowledge base. `kb/` is the product: structured, citable textbook content that is committed and deployed with the app. Everything else here supports it.

First target: Class 9-10 core subjects. See `docs/PLAN.md` for the plan and `docs/EXTRACTION_FINDINGS.md` for what was tested and why LlamaParse replaced Tesseract.

## How a book gets in

Super admin dashboard: **Knowledge Base** (`/admin/knowledge-base`).

1. Upload the book PDF with its title, subject key (`physics`), class (`9-10`), language and the number of PDF pages before the book's page 1. Uploading only saves the file.
2. Choose the page range and press **Parse**. This sends those pages to LlamaParse and uses credits, so try one chapter first.
3. The page checks on the parser every few seconds. When it finishes, the chapters are structured and written to `kb/`. **Rebuild files** re-runs the structuring from the saved parser output at no cost.
4. Review the flagged passages in `chapter.md`, then commit `kb/`.

The code lives in the app: `lib/kb/` (pipeline), `app/api/admin/kb/upload` (upload), `lib/kb/actions.ts` (buttons), `components/super-admin/kb-console.tsx` (page). Tests: `npx tsx --test lib/kb/mdtree.test.ts`.

Needs `LLAMA_CLOUD_API_KEY` in the server environment (`.env.local`) and a server with a writable disk (not Vercel). Set `KB_ROOT` to move this folder.

## Layout

```
kb/<subject>/class-<level>/<lang>/        committed, ships with the app
  textbook.json                           source file, sha256, extraction settings, corrections, page offset
  chapters/NN/chapter.json                title, page ranges, topic index, stats
  chapters/NN/topics/<key>.json           topic with passages (stable ids, kind, body, pdf + printed pages, reviewReasons)
  chapters/NN/chapter.md                  readable copy for review
data/                                     git-ignored: uploads, job state, raw parser pages
docs/                                     plan and findings
sql/schema.sql                            sketch of a future PostgreSQL import (not used yet)
src/chunk.js, src/generate.js             retrieval chunking and the grounded question prompt/validator (not wired yet)
```

Topic keys: `N.0` intro and learning outcomes, `N.M` numbered sections, `N.ex` sample questions.
Review reasons: `latin-junk`, `known-confusable-corrected`, `verify-formula`, `verify-table`.

## Status

Exported: Physics (Bangla) Chapter 1. Not built yet: indexing/retrieval over `kb/`, the question generator wired to an LLM, English editions, other books.

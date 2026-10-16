# Uttirno Curriculum Knowledge Base: Plan

Date: 2026-10-16

## 1. Goal and scope

Build a curriculum-grounded knowledge base from NCTB textbooks so every generated question, quiz and lecture sheet traces back to a textbook passage.

- **First release:** Class 9 and 10 core subjects: Mathematics (General, Higher), Physics, Chemistry, Biology, English, ICT.
- **Later:** Classes 6-8 and 11-12, then non-core subjects. Class and subject are data, not code, so expansion needs no redesign.
- **Languages:** Bangla and English editions linked through one canonical topic ID. Start with Bangla Math and Science, then add English.
- **Quality bar:** production-ready: citations on every item, automated checks, sampled teacher review.
- **Out of scope initially:** diagram-dependent questions (flagged, not generated), student-facing UI.

## 2. Architecture

| Layer | Role |
|---|---|
| Source PDFs (NCTB) | Kept unchanged, checksummed |
| Extraction | Native PDF text first, OCR only for scanned or image pages |
| PostgreSQL | Canonical store: tree, passages, questions, resources, runs |
| Qdrant | Semantic retrieval over passages, filtered by class/subject/chapter |
| Keyword search | Postgres full-text for exact terms and formulas |
| Generator | LLM produces JSON from retrieved passages only, with source IDs |
| Validator | Schema, citation, answer-key, duplicate and syllabus checks |

Core rule: PostgreSQL is the authority; Qdrant only retrieves. The model never answers from its own knowledge as if it were the textbook.

## 3. Data model

Hierarchy: Class -> Subject -> Chapter -> Topic -> Passage (with page refs).

| Table | Stores |
|---|---|
| `textbooks` | class, subject, language, edition, year, file checksum |
| `chapters` | textbook, number, title, ordering |
| `topics` | chapter, canonical `topic_key` shared across languages |
| `passages` | topic, kind (definition, formula, example, text), text, page range |
| `passage_chunks` | retrieval-sized text linked to passages, vector ID |
| `questions` | stem, options, answer, explanation, difficulty, status |
| `question_sources` | question to passage links |
| `resources` | lecture sheets, quizzes, summaries, flashcards |
| `generation_runs` | model, prompt version, source IDs, validation result |

Generated content is stored separately from textbook content, so it can be regenerated or retired without touching sources.

## 4. Pipeline and quality gates

1. Catalogue: register each PDF with class, subject, language, edition, checksum.
2. Extract: per page text with headings, tables, formula blocks and figure refs.
3. Structure: detect chapters and topics; split on semantic boundaries.
4. Spot-check: review 20-30 pages per book before bulk processing.
5. Index: write to PostgreSQL, embed chunks, upsert to Qdrant.
6. Generate: retrieve by topic, produce structured JSON with source IDs.
7. Validate: schema, citation present, answer in options, duplicate similarity, sampled human review.
8. Publish: approved items cached and reused.

## 5. Timeline (solo)

| Phase | Duration | Output |
|---|---|---|
| Schema and ingestion for one book | 2-3 weeks | PDF to structured tree with citations |
| Retrieval and generation | 2-3 weeks | MCQ, quiz, lecture sheet generators |
| Validation layer | 2 weeks | Automated checks, sampled review |
| Class 9-10 core subjects, both languages | 4-6 weeks | Full coverage of the first release |
| Expand to Classes 6-8, 11-12 | 6-10 weeks | Core subjects across 6-12 |

## 6. Budget (BDT, estimates)

| Item | Estimate |
|---|---|
| OCR and extraction | 10,000-30,000 |
| LLM processing and generation | 20,000-60,000 |
| Embeddings | 2,000-6,000 |
| Infra (reuse Uttirno PostgreSQL/Qdrant) | 0-5,000/month |
| Sampled teacher review | 40,000-150,000 |

Full 6-12, both languages: about 1.5-4 lakh excluding your time. Class 9-10 core subjects alone should be a fraction of that.

## 7. Risks and open questions

- Bangla OCR and math notation may need a second pass or manual fixes.
- Diagram-dependent questions are unreliable; flag and skip at first.
- Confirm which edition/curriculum year applies to Class 9 and 10 on the NCTB list.
- Confirm commercial reuse rights for NCTB content before public launch.
- Choose the sampled-review rate (suggested 10%, 100% of answer keys for exam sets).

## 8. Build status

See `README.md` in `uttirno_kb/` for what is implemented.

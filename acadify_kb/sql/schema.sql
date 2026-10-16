-- Canonical store for the curriculum knowledge base (PostgreSQL).
CREATE TABLE textbooks (
  id            BIGSERIAL PRIMARY KEY,
  class_level   SMALLINT NOT NULL CHECK (class_level BETWEEN 6 AND 12),
  subject       TEXT NOT NULL,
  language      TEXT NOT NULL CHECK (language IN ('bn','en')),
  edition_year  SMALLINT NOT NULL,
  title         TEXT NOT NULL,
  file_sha256   TEXT NOT NULL UNIQUE,
  UNIQUE (class_level, subject, language, edition_year)
);

CREATE TABLE chapters (
  id          BIGSERIAL PRIMARY KEY,
  textbook_id BIGINT NOT NULL REFERENCES textbooks(id),
  number      SMALLINT NOT NULL,
  title       TEXT NOT NULL,
  page_start  INT NOT NULL,
  page_end    INT NOT NULL,
  UNIQUE (textbook_id, number)
);

-- topic_key is shared by the Bangla and English edition of the same topic.
CREATE TABLE topics (
  id         BIGSERIAL PRIMARY KEY,
  chapter_id BIGINT NOT NULL REFERENCES chapters(id),
  topic_key  TEXT NOT NULL,
  title      TEXT NOT NULL,
  ordinal    INT NOT NULL,
  UNIQUE (chapter_id, ordinal)
);
CREATE INDEX topics_key_idx ON topics(topic_key);

CREATE TABLE passages (
  id         BIGSERIAL PRIMARY KEY,
  topic_id   BIGINT NOT NULL REFERENCES topics(id),
  kind       TEXT NOT NULL CHECK (kind IN ('text','definition','formula','example','exercise','activity','table','objective','figure')),
  body       TEXT NOT NULL,
  page_start INT NOT NULL,
  page_end   INT NOT NULL,
  ordinal    INT NOT NULL,
  tsv        TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', body)) STORED
);
CREATE INDEX passages_tsv_idx ON passages USING GIN (tsv);

CREATE TABLE passage_chunks (
  id         BIGSERIAL PRIMARY KEY,
  passage_id BIGINT NOT NULL REFERENCES passages(id),
  body       TEXT NOT NULL,
  vector_id  UUID            -- point id in Qdrant
);

CREATE TABLE generation_runs (
  id             BIGSERIAL PRIMARY KEY,
  model          TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  passage_ids    BIGINT[] NOT NULL,
  validation     JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated, non-authoritative content, kept apart from textbook text.
CREATE TABLE questions (
  id          BIGSERIAL PRIMARY KEY,
  topic_id    BIGINT NOT NULL REFERENCES topics(id),
  run_id      BIGINT REFERENCES generation_runs(id),
  kind        TEXT NOT NULL DEFAULT 'mcq',
  stem        TEXT NOT NULL,
  options     JSONB NOT NULL,
  answer_idx  SMALLINT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','retired')),
  stem_hash   TEXT NOT NULL,
  UNIQUE (topic_id, stem_hash)
);

CREATE TABLE question_sources (
  question_id BIGINT NOT NULL REFERENCES questions(id),
  passage_id  BIGINT NOT NULL REFERENCES passages(id),
  PRIMARY KEY (question_id, passage_id)
);

CREATE TABLE resources (
  id       BIGSERIAL PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id),
  run_id   BIGINT REFERENCES generation_runs(id),
  kind     TEXT NOT NULL CHECK (kind IN ('lecture_sheet','quiz','summary','flashcards')),
  content  JSONB NOT NULL,
  status   TEXT NOT NULL DEFAULT 'draft'
);

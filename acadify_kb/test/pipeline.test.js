import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkPassage } from '../src/chunk.js';
import { validateMcqs, generateMcqs, buildMcqPrompt } from '../src/generate.js';

test('chunking keeps formulas whole and splits long text on sentences', () => {
  assert.equal(chunkPassage({ kind: 'formula', body: 'x'.repeat(2000) }).length, 1);
  const long = { kind: 'text', body: Array(40).fill('This is a sentence about algebra.').join(' ') };
  const chunks = chunkPassage(long, 300);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= 300));
});

const passages = [{ id: 7, kind: 'formula', body: 'a^2 - b^2 = (a+b)(a-b)', pageStart: 11, pageEnd: 11 }];
const good = {
  stem: 'Which expression equals a^2 - b^2?',
  options: ['(a+b)(a-b)', '(a+b)^2', '(a-b)^2', 'a^2 + b^2'],
  answer_idx: 0,
  explanation: 'Difference of squares.',
  difficulty: 'easy',
  source_ids: [7],
};

test('validator accepts a grounded question', () => {
  const r = validateMcqs(JSON.stringify({ questions: [good] }), passages);
  assert.equal(r.valid.length, 1);
  assert.equal(r.rejected.length, 0);
});

test('validator rejects ungrounded, malformed and duplicate questions', () => {
  const batch = [
    { ...good, stem: 'No source question here?', source_ids: [] },
    { ...good, stem: 'Unknown source question?', source_ids: [99] },
    { ...good, stem: 'Duplicate options question?', options: ['a', 'a', 'b', 'c'] },
    { ...good, stem: 'Bad answer index question?', answer_idx: 4 },
    { ...good },
    { ...good },
  ];
  const r = validateMcqs(JSON.stringify({ questions: batch }), passages);
  assert.equal(r.valid.length, 1);
  const reasons = r.rejected.flatMap((x) => x.reasons);
  for (const want of ['no_source', 'unknown_source', 'duplicate_options', 'bad_answer_idx', 'duplicate']) {
    assert.ok(reasons.includes(want), want);
  }
});

test('invalid JSON is rejected, prompt carries passage ids, generate wires it together', async () => {
  assert.equal(validateMcqs('nope', passages).rejected[0].reasons[0], 'invalid_json');
  assert.ok(buildMcqPrompt({ passages, count: 1, language: 'en', difficulty: 'easy' }).includes('[P7]'));
  const llm = async () => JSON.stringify({ questions: [good] });
  const r = await generateMcqs(llm, { passages, count: 1, language: 'en', difficulty: 'easy' });
  assert.equal(r.valid.length, 1);
});

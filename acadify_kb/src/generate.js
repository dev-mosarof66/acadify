// Grounded generation: prompt builder + strict output validation.
// The LLM client is injected: `llm(prompt) -> Promise<string>` returning JSON.
import { createHash } from 'node:crypto';

export const PROMPT_VERSION = 'mcq-v1';

export function buildMcqPrompt({ passages, count, language, difficulty }) {
  const src = passages
    .map((p) => `[P${p.id}] (pp. ${p.pageStart}-${p.pageEnd}, ${p.kind})\n${p.body}`)
    .join('\n\n');
  return [
    'You write exam questions strictly from the textbook passages below.',
    `Use ONLY facts stated in the passages. If they do not support ${count} questions, return fewer.`,
    `Language: ${language}. Difficulty: ${difficulty}. Exactly 4 options, one correct.`,
    'Return JSON: {"questions":[{"stem":str,"options":[str,str,str,str],"answer_idx":0-3,',
    '"explanation":str,"difficulty":"easy|medium|hard","source_ids":[passage ids]}]}',
    '',
    src,
  ].join('\n');
}

export const stemHash = (stem) =>
  createHash('sha256').update(stem.toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex');

/** Returns {valid: Question[], rejected: [{question, reasons}]}. */
export function validateMcqs(raw, passages, existingHashes = new Set()) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { valid: [], rejected: [{ question: null, reasons: ['invalid_json'] }] };
  }
  const ids = new Set(passages.map((p) => p.id));
  const seen = new Set(existingHashes);
  const valid = [];
  const rejected = [];
  for (const q of data.questions ?? []) {
    const reasons = [];
    if (typeof q.stem !== 'string' || q.stem.trim().length < 8) reasons.push('bad_stem');
    if (!Array.isArray(q.options) || q.options.length !== 4) reasons.push('options_not_4');
    else if (new Set(q.options.map((o) => String(o).trim().toLowerCase())).size !== 4) reasons.push('duplicate_options');
    if (!Number.isInteger(q.answer_idx) || q.answer_idx < 0 || q.answer_idx > 3) reasons.push('bad_answer_idx');
    if (!q.explanation) reasons.push('no_explanation');
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) reasons.push('bad_difficulty');
    if (!Array.isArray(q.source_ids) || q.source_ids.length === 0) reasons.push('no_source');
    else if (!q.source_ids.every((id) => ids.has(id))) reasons.push('unknown_source');
    if (typeof q.stem === 'string') {
      const h = stemHash(q.stem);
      if (seen.has(h)) reasons.push('duplicate');
      else if (reasons.length === 0) {
        seen.add(h);
        q.stem_hash = h;
      }
    }
    if (reasons.length) rejected.push({ question: q, reasons });
    else valid.push(q);
  }
  return { valid, rejected };
}

export async function generateMcqs(llm, opts, existingHashes) {
  const raw = await llm(buildMcqPrompt(opts));
  return validateMcqs(raw, opts.passages, existingHashes);
}

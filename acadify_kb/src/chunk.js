// Splits passages into retrieval chunks on sentence boundaries. Formulas and
// definitions stay whole so they are never retrieved out of context.
export function chunkPassage(passage, maxChars = 900) {
  if (passage.body.length <= maxChars || passage.kind === 'formula' || passage.kind === 'definition') {
    return [passage.body];
  }
  const sentences = passage.body.split(/(?<=[.!?।])\s+/);
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + ' ' + s).length > maxChars) {
      chunks.push(cur);
      cur = s;
    } else {
      cur = cur ? cur + ' ' + s : s;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

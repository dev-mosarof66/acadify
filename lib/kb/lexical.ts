/**
 * Exact-word search, to sit beside the vectors: BM25 over the words of each chunk. Pure functions.
 *
 * Embeddings find passages that mean the same; BM25 finds the passage that contains the very word, formula
 * symbol or number the question is about. Bangla inflects ("বেগ", "বেগের", "বেগকে"), so words are cut back to a
 * stem with a short list of common suffixes before they are compared.
 */

// Longest first, so "গুলোকে" goes before "কে".
const SUFFIXES = ["গুলোকে", "গুলোর", "গুলো", "গুলি", "দেরকে", "দের", "টিকে", "টির", "টাকে", "টার", "টি", "টা", "য়ের", "েরা", "ের", "েকে", "কে", "তে", "রা", "র", "ে", "য়"];

export function stem(word: string): string {
  for (const s of SUFFIXES) if (word.length - s.length >= 2 && word.endsWith(s)) return word.slice(0, -s.length);
  return word;
}

/** Words of a text: Bangla words (stemmed), Latin words and numbers (lower-cased). LaTeX command names are ignored. */
export function tokenize(text: string): string[] {
  const clean = text.replace(/\\[a-zA-Z]+/g, " ");
  const out: string[] = [];
  for (const m of clean.matchAll(/[ঀ-৿]+|[A-Za-z]+|\d+/g)) {
    const w = m[0];
    if (/^[ঀ-৿]/.test(w)) {
      const s = stem(w);
      if (s.length >= 2) out.push(s);
    } else if (w.length >= 2 || /^\d$/.test(w)) out.push(w.toLowerCase());
  }
  return out;
}

export interface LexicalHit {
  index: number;
  score: number;
}

const K1 = 1.2;
const B = 0.75;

export class Bm25 {
  private readonly postings = new Map<string, [number, number][]>();
  private readonly lengths: number[] = [];
  private readonly avg: number;
  readonly size: number;

  constructor(docs: string[]) {
    this.size = docs.length;
    docs.forEach((doc, i) => {
      const tokens = tokenize(doc);
      this.lengths.push(tokens.length);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const [t, n] of tf) (this.postings.get(t) ?? this.postings.set(t, []).get(t)!).push([i, n]);
    });
    this.avg = this.lengths.reduce((a, b) => a + b, 0) / Math.max(1, this.size);
  }

  /** The best `limit` documents for the query, among those `allowed` accepts. Documents that share no word are left out. */
  search(query: string, limit: number, allowed?: (index: number) => boolean): LexicalHit[] {
    const scores = new Map<number, number>();
    for (const term of new Set(tokenize(query))) {
      const list = this.postings.get(term);
      if (!list) continue;
      const idf = Math.log(1 + (this.size - list.length + 0.5) / (list.length + 0.5));
      for (const [doc, tf] of list) {
        if (allowed && !allowed(doc)) continue;
        const norm = tf * (K1 + 1) / (tf + K1 * (1 - B + (B * this.lengths[doc]) / this.avg));
        scores.set(doc, (scores.get(doc) ?? 0) + idf * norm);
      }
    }
    return [...scores.entries()].map(([index, score]) => ({ index, score })).sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

/** Reciprocal-rank fusion: merges ranked lists without needing their scores to be comparable. */
export function fuse(lists: { index: number; weight: number }[][], k = 60): Map<number, number> {
  const out = new Map<number, number>();
  for (const list of lists) list.forEach(({ index, weight }, rank) => out.set(index, (out.get(index) ?? 0) + weight / (k + rank + 1)));
  return out;
}

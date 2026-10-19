/**
 * Checks retrieval quality: for each query in acadify_kb/eval/queries.json, does the chapter it should come from
 * appear in the top results? Compares meaning-only, words-only and the combination, with and without the subject
 * filter a generator would use. Re-run it after changing the embedder, the chunking or the ranking.
 *
 *   npm run kb:eval
 */
import { readFile } from "node:fs/promises";

import { searchKb } from "../lib/kb/search";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local */
}

type Q = { q: string; subject: string; chapter: number };
const queries: Q[] = JSON.parse(await readFile("acadify_kb/eval/queries.json", "utf8"));
const modes = ["vector", "lexical", "hybrid"] as const;

for (const filtered of [true, false]) {
  console.log(`\n== ${filtered ? "with the subject filter (how a generator calls it)" : "no filter: the whole library"}`);
  for (const mode of modes) {
    let at1 = 0, at3 = 0, at5 = 0;
    const misses: string[] = [];
    for (const { q, subject, chapter } of queries) {
      const { hits } = await searchKb(q, { mode, limit: 5, filters: filtered ? { subject } : {} });
      const rank = hits.findIndex((h) => h.item.subject === subject && h.item.chapter === chapter);
      if (rank === 0) at1++;
      if (rank >= 0 && rank < 3) at3++;
      if (rank >= 0) at5++; else misses.push(`${q} (want ${subject} ch${chapter}; got ${hits.slice(0, 2).map((h) => `${h.item.subject} ch${h.item.chapter}`).join(", ")})`);
    }
    const pct = (n: number) => `${Math.round((n / queries.length) * 100)}%`;
    console.log(`${mode.padEnd(8)} top-1 ${pct(at1)}  top-3 ${pct(at3)}  top-5 ${pct(at5)}`);
    if (mode === "hybrid" && misses.length) for (const m of misses) console.log(`   miss: ${m}`);
  }
}

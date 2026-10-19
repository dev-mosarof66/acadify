/**
 * Builds the knowledge-base search index: embeds every released lesson chunk and exercise item and writes
 * acadify_kb/index/<embedder>/. Run it after the knowledge base changes; unchanged chunks keep their vector.
 *
 *   npm run kb:embed
 *
 * Which embedder: KB_EMBED_PROVIDER = local (default) | voyage | openai | cohere, optionally KB_EMBED_MODEL, with
 * VOYAGE_API_KEY / OPENAI_API_KEY / COHERE_API_KEY for the hosted ones. The first local run downloads the model
 * (about 120 MB) into acadify_kb/.cache.
 */
import { embedConfig, embedderId, makeEmbedder } from "../lib/kb/embed";
import { buildIndex } from "../lib/kb/index-store";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local; the environment is enough */
}

const config = embedConfig();
const embedder = makeEmbedder(config);
console.log(`Embedder: ${embedderId(config)}`);

const started = Date.now();
let lastPrinted = 0;
const result = await buildIndex(embedder, {
  log: (line) => console.log(line),
  onProgress: (done, total) => {
    if (done - lastPrinted >= 100 || done === total) {
      lastPrinted = done;
      const seconds = (Date.now() - started) / 1000;
      console.log(`  embedded ${done}/${total} (${seconds.toFixed(0)} s)`);
    }
  },
});

const { counts, books, dims } = result.meta;
console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(0)} s: ${counts.lesson} lesson chunks and ${counts.exercise} exercise items, ${dims} dimensions.`);
for (const b of books) console.log(`  ${b.id}: ${b.lesson} chunks, ${b.exercise} exercise items`);
if (result.skipped.length) console.log(`Skipped (not page-checked): ${result.skipped.map((s) => s.id).join(", ")}`);

/**
 * Try the search from the terminal.
 *
 *   npm run kb:search -- "বেগ কাকে বলে"
 *   npm run kb:search -- "what is a mole" --subject chemistry --chapter 6 --limit 5
 *   npm run kb:search -- "দ্বিঘাত সমীকরণ" --pool exercise --mode lexical
 */
import { searchKb, type SearchFilters } from "../lib/kb/search";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local */
}

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const query = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--"))).join(" ").trim();
if (!query) {
  console.error('Usage: npm run kb:search -- "your question" [--subject physics] [--chapter 3] [--pool exercise] [--limit 8] [--mode hybrid|lexical|vector]');
  process.exit(1);
}

const filters: SearchFilters = { subject: flag("subject"), classLevel: flag("class"), pool: (flag("pool") as "lesson" | "exercise" | undefined) ?? "lesson" };
if (flag("chapter")) filters.chapter = flag("chapter")!.split(",").map(Number);
if (flag("topic")) filters.topic = flag("topic");

const result = await searchKb(query, { filters, limit: Number(flag("limit") ?? 8), mode: (flag("mode") as "hybrid" | "lexical" | "vector" | undefined) ?? "hybrid" });
console.log(`mode: ${result.mode}${result.warning ? `\n${result.warning}` : ""}\n`);
for (const [i, h] of result.hits.entries()) {
  const it = h.item;
  console.log(`${i + 1}. [${it.subject} ch${it.chapter} ${it.topic}] ${it.chapterTitle} › ${it.topicTitle || it.topic} (p. ${it.pages[0]}${it.pages[1] !== it.pages[0] ? `-${it.pages[1]}` : ""})  vec#${h.vectorRank ?? "-"} word#${h.lexicalRank ?? "-"}`);
  console.log(`   ${it.text.replace(/\s+/g, " ").slice(0, 160)}…\n`);
}

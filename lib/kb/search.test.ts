import assert from "node:assert/strict";
import test from "node:test";

import { embedConfig, embedderId, makeEmbedder, normalize, type Embedder } from "./embed";
import { exemplarsFor, formatContext, groundingFor } from "./ground";
import type { IndexedItem, LoadedIndex } from "./index-store";
import { Bm25, fuse, stem, tokenize } from "./lexical";
import { curriculum, matchesFilters, searchKb } from "./search";

const item = (id: string, text: string, extra: Partial<IndexedItem> = {}): IndexedItem => ({
  id, pool: "lesson", hash: id, book: "physics-9-10-bn", subject: "physics", classLevel: "9-10", language: "bn",
  chapter: 2, chapterTitle: "গতি", topic: "2.1", topicTitle: "বেগ", pages: [10, 11], text, ...extra,
});

// three directions in a 3-d space stand for three topics
const VEC: Record<string, number[]> = { velocity: [1, 0, 0], acid: [0, 1, 0], sets: [0, 0, 1] };
function fakeIndex(items: IndexedItem[], dir: (i: IndexedItem) => string): LoadedIndex {
  const vectors = new Float32Array(items.length * 3);
  items.forEach((it, i) => vectors.set(normalize(VEC[dir(it)]), i * 3));
  return { meta: { schema: 1, embedder: "fake:test", dims: 3, builtAt: "", counts: { lesson: items.length, exercise: 0 }, books: [] }, items, vectors, bm25: new Bm25(items.map((x) => x.text)) };
}
const fakeEmbedder = (vec: number[]): Embedder => ({ id: "fake:test", embedDocuments: async () => [], embedQuery: async () => normalize(vec) });

test("Bangla words are cut back to a stem, so inflected forms match", () => {
  assert.equal(stem("বেগের"), "বেগ");
  assert.equal(stem("বেগকে"), "বেগ");
  assert.equal(stem("বস্তুগুলোর"), "বস্তু");
  assert.equal(stem("কে"), "কে"); // too short to cut
  // one-letter words (the "ও", the s and t of a formula) carry no meaning on their own and are dropped
  assert.deepEqual(tokenize("বেগ ও Speed = $\\frac{s}{t}$ 10 m/s"), ["বেগ", "speed", "10"]);
});

test("BM25 ranks the passage that holds the word, and a filter can rule passages out", () => {
  const docs = ["বেগ হলো সরণের পরিবর্তনের হার", "অম্ল ও ক্ষারকের বিক্রিয়ায় লবণ হয়", "সেটের সংযোগ ও ছেদ"];
  const bm = new Bm25(docs);
  assert.equal(bm.search("বেগের মান", 3)[0].index, 0);
  assert.deepEqual(bm.search("বেগের মান", 3, (i) => i !== 0), []);
  assert.deepEqual(bm.search("কিছুই নেই এখানে xyz", 3), []);
});

test("fusion rewards a passage that both lists rank well", () => {
  const f = fuse([[{ index: 1, weight: 1 }, { index: 2, weight: 1 }], [{ index: 2, weight: 1 }, { index: 3, weight: 1 }]]);
  const best = [...f.entries()].sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(best, 2);
});

test("filters: subject, chapter, topic prefix, pool, and passages that point to a missing figure", () => {
  const a = item("a", "x", { chapter: 4, topic: "4.3" });
  assert.ok(matchesFilters(a, { subject: "physics", chapter: [3, 4], topic: "4" }));
  assert.ok(!matchesFilters(a, { subject: "chemistry" }));
  assert.ok(!matchesFilters(a, { topic: "4.1" }));
  assert.ok(!matchesFilters(a, { pool: "exercise" }));
  assert.ok(!matchesFilters({ ...a, missingFigures: ["4.01"] }, { excludeMissingFigures: true }));
  assert.ok(matchesFilters({ ...a, missingFigures: ["4.01"] }, {}));
});

test("hybrid search finds the passage by meaning even when it shares no word with the query", async () => {
  const items = [item("v", "সময়ের সাথে সরণের পরিবর্তনের হার"), item("a", "অম্ল ও ক্ষার মিশে লবণ হয়"), item("s", "দুটি সেটের সকল উপাদান")];
  const index = fakeIndex(items, (it) => ({ v: "velocity", a: "acid", s: "sets" })[it.id]!);
  const r = await searchKb("গতির দ্রুততা", { index, embedder: fakeEmbedder(VEC.velocity), limit: 2 });
  assert.equal(r.mode, "hybrid");
  assert.equal(r.hits[0].item.id, "v");
});

test("search falls back to words alone, with a warning, when the embedder fails", async () => {
  const items = [item("v", "বেগ হলো সরণের হার"), item("a", "অম্ল ও ক্ষার")];
  const index = fakeIndex(items, (it) => (it.id === "v" ? "velocity" : "acid"));
  const broken: Embedder = { id: "fake:test", embedDocuments: async () => [], embedQuery: async () => { throw new Error("model not available"); } };
  const r = await searchKb("বেগ", { index, embedder: broken });
  assert.equal(r.mode, "lexical");
  assert.match(r.warning ?? "", /model not available/);
  assert.equal(r.hits[0].item.id, "v");
});

test("grounding returns numbered, cited passages and drops text that needs a missing figure", async () => {
  const items = [
    item("c1", "বেগের সংজ্ঞা ও উদাহরণ", { chapter: 2, topic: "2.1" }),
    item("c2", "চিত্র ২.০৯ দেখো", { chapter: 2, topic: "2.2", missingFigures: ["2.09"] }),
    item("c3", "বল ও গতি", { chapter: 3, topic: "3.1", topicTitle: "বল", chapterTitle: "বল" }),
  ];
  const index = fakeIndex(items, () => "velocity");
  const g = await groundingFor({ subject: "physics", chapters: [2], index });
  assert.equal(g.mode, "listing");
  assert.equal(g.sources.length, 1);
  assert.match(g.context, /^\[S1\] Chapter 2: গতি > বেগ \(pp\. 10-11\)\nবেগের সংজ্ঞা/);
  const withFig = await groundingFor({ subject: "physics", chapters: [2], allowMissingFigures: true, index });
  assert.equal(withFig.sources.length, 2);
  assert.equal(formatContext([items[2]]).sources[0].label, "S1");
});

test("a long chapter listing is thinned evenly, not cut off at the end", async () => {
  const items = Array.from({ length: 40 }, (_, i) => item(`k${i}`, `পাঠ ${i} `.repeat(60), { topic: `2.${i}` }));
  const index = fakeIndex(items, () => "velocity");
  const g = await groundingFor({ subject: "physics", chapters: [2], maxChars: 3000, index });
  assert.ok(g.thinned);
  assert.ok(g.context.length <= 3000 + 400);
  const kept = g.sources.map((s) => Number(s.id.slice(1)));
  assert.ok(kept.at(-1)! > 20, `reaches deep into the chapter: ${kept.join(",")}`);
});

test("exercise examples come only from the exercise pool, spread over the chapters", async () => {
  const items = [item("l", "পাঠ"), ...Array.from({ length: 12 }, (_, i) => item(`x${i}`, `প্রশ্ন ${i}`, { pool: "exercise", type: i % 2 ? "mcq" : "short", chapter: 1 + (i % 3) }))];
  const index = fakeIndex(items, () => "velocity");
  const ex = await exemplarsFor({ subject: "physics", limit: 4, index });
  assert.equal(ex.length, 4);
  assert.ok(ex.every((x) => x.pool === "exercise"));
  assert.ok((await exemplarsFor({ subject: "physics", type: "mcq", index })).every((x) => x.type === "mcq"));
});

test("curriculum lists chapters and topics of the lesson pool", async () => {
  const index = fakeIndex([item("a", "x", { topic: "2.1", topicTitle: "বেগ" }), item("b", "y", { topic: "2.2", topicTitle: "ত্বরণ" })], () => "velocity");
  const c = await curriculum(index);
  assert.equal(c[0].chapters[0].topics.length, 2);
});

test("embedder choice comes from the environment and API keys are required for hosted providers", () => {
  assert.equal(embedderId(embedConfig({})), "local:Xenova/multilingual-e5-small");
  assert.equal(embedderId(embedConfig({ KB_EMBED_PROVIDER: "voyage" })), "voyage:voyage-3.5");
  assert.throws(() => embedConfig({ KB_EMBED_PROVIDER: "nope" }));
  assert.throws(() => makeEmbedder({ provider: "voyage", model: "m" }, {}), /VOYAGE_API_KEY/);
});

test("hosted providers send the documented request and return unit vectors", async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fakeFetch = (async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    const n = (body.input ?? body.texts).length;
    const vec = [3, 4];
    const data = url.includes("cohere") ? { embeddings: { float: Array(n).fill(vec) } } : { data: Array(n).fill({ embedding: vec }) };
    return { ok: true, status: 200, json: async () => data, text: async () => "" };
  }) as unknown as typeof fetch;

  const voyage = makeEmbedder({ provider: "voyage", model: "voyage-3.5" }, { VOYAGE_API_KEY: "k" }, fakeFetch);
  const [v] = await voyage.embedDocuments(["a"]);
  assert.deepEqual([...v].map((x) => Math.round(x * 10) / 10), [0.6, 0.8]);
  assert.equal(calls[0].url, "https://api.voyageai.com/v1/embeddings");
  assert.equal(calls[0].body.input_type, "document");
  await voyage.embedQuery("q");
  assert.equal(calls[1].body.input_type, "query");

  await makeEmbedder({ provider: "openai", model: "text-embedding-3-small" }, { OPENAI_API_KEY: "k" }, fakeFetch).embedQuery("q");
  assert.equal(calls[2].url, "https://api.openai.com/v1/embeddings");
  await makeEmbedder({ provider: "cohere", model: "embed-multilingual-v3.0" }, { COHERE_API_KEY: "k" }, fakeFetch).embedQuery("q");
  assert.equal(calls[3].body.input_type, "search_query");
  assert.deepEqual(calls[3].body.embedding_types, ["float"]);
});

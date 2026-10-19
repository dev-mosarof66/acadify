import "server-only";

import { KB_MODEL_CACHE } from "./paths";

/**
 * Turns text into vectors. One interface, four providers:
 *  - local   (default): a multilingual model run in-process with transformers.js. No key, works offline once
 *            the weights are cached; fine for building the index and for a server with a disk and memory.
 *  - voyage / openai / cohere: a hosted embeddings API, chosen by KB_EMBED_PROVIDER with its key in the environment.
 *            Use one of these where the local model is too heavy to run (e.g. a serverless host).
 * A search index records which embedder built it; queries must use the same one.
 */
export interface Embedder {
  /** "provider:model", stored in the index so a query is never compared with vectors from another model. */
  id: string;
  embedDocuments(texts: string[], onProgress?: (done: number, total: number) => void): Promise<Float32Array[]>;
  embedQuery(text: string): Promise<Float32Array>;
}

export type EmbedProvider = "local" | "voyage" | "openai" | "cohere";
export interface EmbedConfig {
  provider: EmbedProvider;
  model: string;
}

const DEFAULT_MODEL: Record<EmbedProvider, string> = {
  local: "Xenova/multilingual-e5-small",
  voyage: "voyage-3.5",
  openai: "text-embedding-3-small",
  cohere: "embed-multilingual-v3.0",
};

export function embedConfig(env: Record<string, string | undefined> = process.env): EmbedConfig {
  const raw = (env.KB_EMBED_PROVIDER ?? "local").toLowerCase();
  const provider = (["local", "voyage", "openai", "cohere"] as const).find((p) => p === raw);
  if (!provider) throw new Error(`KB_EMBED_PROVIDER must be local, voyage, openai or cohere (got "${raw}").`);
  return { provider, model: env.KB_EMBED_MODEL || DEFAULT_MODEL[provider] };
}

export const embedderId = (c: EmbedConfig) => `${c.provider}:${c.model}`;

/** Scale to unit length, so a dot product is the cosine similarity. */
export function normalize(v: ArrayLike<number>): Float32Array {
  const out = new Float32Array(v.length);
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type FetchLike = typeof fetch;

async function postJson(fetchFn: FetchLike, url: string, key: string, body: unknown): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetchFn(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
    if (res.ok) return res.json();
    // rate limits and server errors are worth waiting out; anything else is a mistake in the request or the key
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await sleep(500 * 2 ** attempt);
      continue;
    }
    throw new Error(`Embeddings request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
}

function hosted(config: EmbedConfig, key: string, fetchFn: FetchLike): Embedder {
  const { provider, model } = config;
  const batchSize = provider === "cohere" ? 96 : provider === "voyage" ? 64 : 128;
  const call = async (texts: string[], kind: "document" | "query"): Promise<Float32Array[]> => {
    if (provider === "voyage") {
      const r = (await postJson(fetchFn, "https://api.voyageai.com/v1/embeddings", key, { input: texts, model, input_type: kind })) as { data: { embedding: number[] }[] };
      return r.data.map((d) => normalize(d.embedding));
    }
    if (provider === "openai") {
      const r = (await postJson(fetchFn, "https://api.openai.com/v1/embeddings", key, { input: texts, model })) as { data: { embedding: number[] }[] };
      return r.data.map((d) => normalize(d.embedding));
    }
    const r = (await postJson(fetchFn, "https://api.cohere.com/v2/embed", key, { texts, model, input_type: kind === "document" ? "search_document" : "search_query", embedding_types: ["float"] })) as { embeddings: { float: number[][] } };
    return r.embeddings.float.map((e) => normalize(e));
  };
  return {
    id: embedderId(config),
    async embedDocuments(texts, onProgress) {
      const out: Float32Array[] = [];
      for (let i = 0; i < texts.length; i += batchSize) {
        out.push(...(await call(texts.slice(i, i + batchSize), "document")));
        onProgress?.(Math.min(i + batchSize, texts.length), texts.length);
      }
      return out;
    },
    async embedQuery(text) {
      return (await call([text], "query"))[0];
    },
  };
}

function local(config: EmbedConfig): Embedder {
  // e5 models expect "query: " and "passage: " prefixes; other models take the text as it is
  const e5 = /e5/i.test(config.model);
  let extractor: Promise<(texts: string[], opts: object) => Promise<{ tolist(): number[][] }>> | null = null;
  const load = () =>
    (extractor ??= (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = KB_MODEL_CACHE;
      return (await pipeline("feature-extraction", config.model, { dtype: "q8" })) as unknown as (texts: string[], opts: object) => Promise<{ tolist(): number[][] }>;
    })());
  const run = async (texts: string[]) => {
    const out = await (await load())(texts, { pooling: "mean", normalize: true });
    return out.tolist().map((v) => normalize(v));
  };
  return {
    id: embedderId(config),
    async embedDocuments(texts, onProgress) {
      const out: Float32Array[] = [];
      const batch = 16;
      for (let i = 0; i < texts.length; i += batch) {
        out.push(...(await run(texts.slice(i, i + batch).map((t) => (e5 ? `passage: ${t}` : t)))));
        onProgress?.(Math.min(i + batch, texts.length), texts.length);
      }
      return out;
    },
    async embedQuery(text) {
      return (await run([e5 ? `query: ${text}` : text]))[0];
    },
  };
}

/** Builds the embedder for a config. `fetchFn` is only for tests. */
export function makeEmbedder(config: EmbedConfig, env: Record<string, string | undefined> = process.env, fetchFn: FetchLike = fetch): Embedder {
  if (config.provider === "local") return local(config);
  const keyName = { voyage: "VOYAGE_API_KEY", openai: "OPENAI_API_KEY", cohere: "COHERE_API_KEY" }[config.provider];
  const key = env[keyName];
  if (!key) throw new Error(`${keyName} is not set, but KB_EMBED_PROVIDER is ${config.provider}.`);
  return hosted(config, key, fetchFn);
}

let shared: Embedder | null = null;
/** The embedder chosen by the environment, created once per process. */
export function getEmbedder(): Embedder {
  return (shared ??= makeEmbedder(embedConfig()));
}

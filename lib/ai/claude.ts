import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { and, eq, gte, sql } from "drizzle-orm";

import { aiJobs, db, institutes, plans } from "@/lib/db";

/*
 * The AI gateway: one Claude client, the model each task uses, what a call costs, and the
 * per-institute monthly AI credit. Every AI feature goes through here.
 */

/** Question papers and other generation work. */
export const GENERATION_MODEL = "claude-sonnet-5-5";

/** USD per million tokens (Anthropic list prices). */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** Approximate exchange rate, for showing and capping AI spend in taka. */
export const BDT_PER_USD = 122;

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
export function claude() {
  if (!aiConfigured()) throw new Error("AI is not set up yet: ANTHROPIC_API_KEY is missing.");
  client ??= new Anthropic({ timeout: 5 * 60 * 1000 });
  return client;
}

/** Cost of a call in BDT, from its token usage (unknown models are priced as Opus, to stay on the safe side). */
export function costBdt(model: string, usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }) {
  const price = PRICES[model] ?? PRICES["claude-opus-5-5"];
  const input = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1;
  const usd = (input * price.input + usage.output_tokens * price.output) / 1_000_000;
  return Math.round(usd * BDT_PER_USD * 100) / 100;
}

/** This calendar month's AI spend and the plan's cap (null = no cap). */
export async function getAiCredit(instituteId: string) {
  const monthStart = sql`date_trunc('month', now())`;
  const [[spent], [plan]] = await Promise.all([
    db
      .select({ bdt: sql<number>`coalesce(sum(${aiJobs.costBdt}), 0)::float` })
      .from(aiJobs)
      .where(and(eq(aiJobs.instituteId, instituteId), gte(aiJobs.createdAt, monthStart))),
    db.select({ cap: plans.aiCreditBdt }).from(institutes).innerJoin(plans, eq(institutes.plan, plans.key)).where(eq(institutes.id, instituteId)).limit(1),
  ]);
  const cap = plan?.cap ?? null;
  const used = spent?.bdt ?? 0;
  return { used, cap, left: cap === null ? null : Math.max(0, cap - used) };
}

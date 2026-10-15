import "server-only";

import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db, faqs } from "@/lib/db";

/** Cache tag for the homepage FAQs; FAQ actions call updateTag(FAQS_TAG). */
export const FAQS_TAG = "faqs";

export interface Faq {
  id: string;
  question: string;
  questionBn: string;
  answer: string;
  answerBn: string;
  isPublic: boolean;
  sortOrder: number;
}

const toFaq = (r: typeof faqs.$inferSelect): Faq => ({
  id: r.id,
  question: r.question,
  questionBn: r.questionBn,
  answer: r.answer,
  answerBn: r.answerBn,
  isPublic: r.isPublic,
  sortOrder: r.sortOrder,
});

/** Every FAQ in order (console). */
export async function getFaqs(): Promise<Faq[]> {
  const rows = await db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
  return rows.map(toFaq);
}

/** FAQs shown on the homepage. Cached until one changes. */
export async function getPublicFaqs(): Promise<Faq[]> {
  "use cache";
  cacheTag(FAQS_TAG);
  cacheLife("max");
  const rows = await db.select().from(faqs).where(eq(faqs.isPublic, true)).orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
  return rows.map(toFaq);
}

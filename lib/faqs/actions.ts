"use server";

import { asc, eq, max } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { assertSuperAdmin } from "@/lib/auth/session";
import { db, faqs } from "@/lib/db";
import { FAQS_TAG } from "./queries";

export type FaqResult = { ok: true } | { ok: false; error: string; field?: string };

function refresh() {
  updateTag(FAQS_TAG);
  revalidatePath("/admin/faqs");
}

/** Creates an FAQ (no `id` in the form) or updates one. */
export async function saveFaq(form: FormData): Promise<FaqResult> {
  await assertSuperAdmin();
  const get = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const id = get("id", 40);
  const values = {
    question: get("question", 200),
    questionBn: get("questionBn", 200),
    answer: get("answer", 1500),
    answerBn: get("answerBn", 1500),
  };
  if (!values.question) return { ok: false, error: "Write the question.", field: "question" };
  if (!values.answer) return { ok: false, error: "Write the answer.", field: "answer" };
  if (values.questionBn && !values.answerBn) return { ok: false, error: "Add the Bangla answer too, or leave both Bangla fields empty.", field: "answerBn" };

  if (id) {
    const [row] = await db.update(faqs).set(values).where(eq(faqs.id, id)).returning({ id: faqs.id });
    if (!row) return { ok: false, error: "This question no longer exists." };
  } else {
    const [{ last }] = await db.select({ last: max(faqs.sortOrder) }).from(faqs);
    await db.insert(faqs).values({ ...values, sortOrder: (last ?? -1) + 1 });
  }
  refresh();
  return { ok: true };
}

export async function setFaqPublic(id: string, isPublic: boolean): Promise<FaqResult> {
  await assertSuperAdmin();
  await db.update(faqs).set({ isPublic }).where(eq(faqs.id, id));
  refresh();
  return { ok: true };
}

export async function moveFaq(id: string, direction: -1 | 1): Promise<FaqResult> {
  await assertSuperAdmin();
  const order = (await db.select({ id: faqs.id }).from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.createdAt))).map((r) => r.id);
  const from = order.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return { ok: true };
  [order[from], order[to]] = [order[to], order[from]];
  await Promise.all(order.map((fid, i) => db.update(faqs).set({ sortOrder: i }).where(eq(faqs.id, fid))));
  refresh();
  return { ok: true };
}

export async function deleteFaq(id: string): Promise<FaqResult> {
  await assertSuperAdmin();
  await db.delete(faqs).where(eq(faqs.id, id));
  refresh();
  return { ok: true };
}

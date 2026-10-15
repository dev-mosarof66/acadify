"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { assertSuperAdmin } from "@/lib/auth/session";
import { db, institutes, platformActivity, platformSettings, smsCreditTransactions, smsMessages } from "@/lib/db";
import { getSettings, SETTINGS_TAG } from "@/lib/settings/queries";
import { bdMobileDigits } from "@/lib/settings/types";
import { getSmsProvider } from "./provider";
import { smsSegments } from "./segments";

const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

export type SmsActionResult = { ok: true; message?: string } | { ok: false; error: string; field?: string };

/** Adds (or, with a negative number, removes) SMS credits for an institute, with a note for the record. */
export async function adjustSmsCredits(slug: string, form: FormData): Promise<SmsActionResult> {
  const admin = await assertSuperAdmin();
  const credits = Number(toAsciiDigits(String(form.get("credits") ?? "")).replace(/[,\s]/g, ""));
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  if (!Number.isInteger(credits) || credits === 0 || Math.abs(credits) > 1_000_000) {
    return { ok: false, error: "Enter a whole number of SMS credits, e.g. 1000 (or -100 to remove).", field: "credits" };
  }

  const [inst] = await db
    .select({ id: institutes.id, name: institutes.name, credit: institutes.smsCredit })
    .from(institutes)
    .where(eq(institutes.slug, slug))
    .limit(1);
  if (!inst) return { ok: false, error: "Institute not found." };
  if (inst.credit + credits < 0) return { ok: false, error: `${inst.name} only has ${inst.credit} credits left.`, field: "credits" };

  await db
    .update(institutes)
    .set({ smsCredit: sql`${institutes.smsCredit} + ${credits}` })
    .where(eq(institutes.id, inst.id));
  await db.insert(smsCreditTransactions).values({ instituteId: inst.id, credits, note, createdBy: admin.id });
  const amount = Math.abs(credits).toLocaleString("en-IN");
  await db.insert(platformActivity).values({
    kind: "sms",
    text: `${inst.name}: ${amount} SMS credits ${credits > 0 ? "added" : "removed"}`,
    instituteId: inst.id,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Sender ID and the per-SMS rate (entered in taka, stored in poisha). */
export async function saveSmsSettings(form: FormData): Promise<SmsActionResult> {
  await assertSuperAdmin();
  const senderId = String(form.get("smsSenderId") ?? "").trim().slice(0, 20);
  const rate = Number(toAsciiDigits(String(form.get("smsRate") ?? "")).replace(/[৳\s]/g, ""));
  if (!Number.isFinite(rate) || rate < 0 || rate > 10) return { ok: false, error: "Enter the price of one SMS in taka, e.g. 0.35.", field: "smsRate" };

  const values = { smsSenderId: senderId, smsRatePoisha: Math.round(rate * 100) };
  await db.insert(platformSettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: platformSettings.id, set: values });
  updateTag(SETTINGS_TAG);
  revalidatePath("/admin/sms");
  return { ok: true };
}

/** Sends one test SMS through the connected provider and records it. */
export async function sendTestSms(form: FormData): Promise<SmsActionResult> {
  await assertSuperAdmin();
  const to = bdMobileDigits(toAsciiDigits(String(form.get("to") ?? "")));
  const body = String(form.get("body") ?? "").trim().slice(0, 600);
  if (!to) return { ok: false, error: "Enter a Bangladeshi mobile number (01XXXXXXXXX).", field: "to" };
  if (!body) return { ok: false, error: "Write the message.", field: "body" };

  const provider = getSmsProvider();
  if (!provider) return { ok: false, error: "No SMS provider is connected yet, so nothing can be sent." };

  const settings = await getSettings();
  const { segments } = smsSegments(body);
  const result = await provider.send(to, body, settings.smsSenderId);
  await db.insert(smsMessages).values({
    to,
    body,
    segments,
    status: result.ok ? "sent" : "failed",
    provider: provider.label,
    providerMessageId: result.ok ? (result.providerMessageId ?? null) : null,
    error: result.ok ? null : result.error,
    costPoisha: result.ok ? segments * settings.smsRatePoisha : 0,
  });
  revalidatePath("/admin/sms");
  return result.ok ? { ok: true, message: `Sent to +${to}.` } : { ok: false, error: `The provider refused it: ${result.error}` };
}

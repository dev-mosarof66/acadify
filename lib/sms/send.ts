import "server-only";

import { eq, sql } from "drizzle-orm";

import { db, institutes, smsMessages } from "@/lib/db";
import { getSettings } from "@/lib/settings/queries";
import { bdMobileDigits } from "@/lib/settings/types";
import { getSmsProvider } from "./provider";
import { smsSegments } from "./segments";

export type InstituteSmsResult =
  | { ok: true; sent: number; failed: number; segments: number }
  | { ok: false; reason: "not-connected" | "no-credit" | "nothing-to-send"; needed?: number; balance?: number };

/**
 * Sends SMS on behalf of an institute: checks the provider and the institute's credit balance first,
 * logs every message, and takes the credits for the ones that went out.
 */
export async function sendInstituteSms(instituteId: string, messages: { to: string; body: string }[]): Promise<InstituteSmsResult> {
  const valid = messages
    .map((m) => ({ ...m, to: bdMobileDigits(m.to), segments: smsSegments(m.body).segments }))
    .filter((m) => m.to && m.body);
  if (!valid.length) return { ok: false, reason: "nothing-to-send" };

  const provider = getSmsProvider();
  if (!provider) return { ok: false, reason: "not-connected" };

  const needed = valid.reduce((n, m) => n + m.segments, 0);
  const [inst] = await db.select({ credit: institutes.smsCredit }).from(institutes).where(eq(institutes.id, instituteId)).limit(1);
  if (!inst || inst.credit < needed) return { ok: false, reason: "no-credit", needed, balance: inst?.credit ?? 0 };

  const settings = await getSettings();
  let sent = 0;
  let failed = 0;
  let used = 0;
  for (const m of valid) {
    const result = await provider.send(m.to, m.body, settings.smsSenderId);
    await db.insert(smsMessages).values({
      instituteId,
      to: m.to,
      body: m.body,
      segments: m.segments,
      status: result.ok ? "sent" : "failed",
      provider: provider.label,
      providerMessageId: result.ok ? (result.providerMessageId ?? null) : null,
      error: result.ok ? null : result.error,
      costPoisha: result.ok ? m.segments * settings.smsRatePoisha : 0,
    });
    if (result.ok) {
      sent++;
      used += m.segments;
    } else failed++;
  }

  if (used) {
    await db
      .update(institutes)
      .set({ smsCredit: sql`${institutes.smsCredit} - ${used}`, smsUsed: sql`${institutes.smsUsed} + ${used}` })
      .where(eq(institutes.id, instituteId));
  }
  return { ok: true, sent, failed, segments: used };
}

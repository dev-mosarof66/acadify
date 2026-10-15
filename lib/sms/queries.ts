import "server-only";

import { and, asc, count, desc, eq, gte, sql, sum } from "drizzle-orm";

import { db, institutes, smsCreditTransactions, smsMessages } from "@/lib/db";

export type SmsInstituteRow = { slug: string; name: string; status: string; credit: number; usedThisMonth: number };
export type SmsMessageRow = {
  id: string;
  to: string;
  body: string;
  segments: number;
  status: string;
  error: string | null;
  instituteName: string | null;
  createdAt: string;
};
export type SmsTopUpRow = { id: string; instituteName: string; credits: number; note: string; createdAt: string };

const DHAKA_OFFSET_MS = 6 * 3600_000;

/** Start of the current month in Dhaka (UTC+6). */
function monthStart(now: number) {
  const d = new Date(now + DHAKA_OFFSET_MS);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - DHAKA_OFFSET_MS);
}

/** Everything the SMS Gateway page shows. */
export async function getSmsOverview(now: number) {
  const since = monthStart(now);
  const fortnight = new Date(now - 13 * 86_400_000);

  const [instituteRows, monthUsage, [totals], [failed], daily, recent, topUps] = await Promise.all([
    db
      .select({ id: institutes.id, slug: institutes.slug, name: institutes.name, status: institutes.status, credit: institutes.smsCredit })
      .from(institutes)
      .orderBy(asc(institutes.name)),
    db
      .select({ instituteId: smsMessages.instituteId, segments: sum(smsMessages.segments) })
      .from(smsMessages)
      .where(gte(smsMessages.createdAt, since))
      .groupBy(smsMessages.instituteId),
    db
      .select({ messages: count(), segments: sum(smsMessages.segments), cost: sum(smsMessages.costPoisha) })
      .from(smsMessages)
      .where(gte(smsMessages.createdAt, since)),
    db
      .select({ n: count() })
      .from(smsMessages)
      .where(and(gte(smsMessages.createdAt, since), eq(smsMessages.status, "failed"))),
    getDailyRows(fortnight),
    db
      .select({ m: smsMessages, instituteName: institutes.name })
      .from(smsMessages)
      .leftJoin(institutes, eq(smsMessages.instituteId, institutes.id))
      .orderBy(desc(smsMessages.createdAt))
      .limit(25),
    db
      .select({ t: smsCreditTransactions, instituteName: institutes.name })
      .from(smsCreditTransactions)
      .innerJoin(institutes, eq(smsCreditTransactions.instituteId, institutes.id))
      .orderBy(desc(smsCreditTransactions.createdAt))
      .limit(10),
  ]);

  const usedBy = new Map(monthUsage.map((u) => [u.instituteId, Number(u.segments ?? 0)]));

  return {
    institutes: instituteRows.map<SmsInstituteRow>((r) => ({
      slug: r.slug,
      name: r.name,
      status: r.status,
      credit: r.credit,
      usedThisMonth: usedBy.get(r.id) ?? 0,
    })),
    month: { messages: totals?.messages ?? 0, segments: Number(totals?.segments ?? 0), costPoisha: Number(totals?.cost ?? 0), failed: failed?.n ?? 0 },
    days: fillDays(daily, now),
    recent: recent.map<SmsMessageRow>(({ m, instituteName }) => ({
      id: m.id,
      to: m.to,
      body: m.body,
      segments: m.segments,
      status: m.status,
      error: m.error,
      instituteName,
      createdAt: m.createdAt.toISOString(),
    })),
    topUps: topUps.map<SmsTopUpRow>(({ t, instituteName }) => ({
      id: t.id,
      instituteName,
      credits: t.credits,
      note: t.note,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

function getDailyRows(since: Date) {
  return db
    .select({
      day: sql<string>`to_char(${smsMessages.createdAt} at time zone 'Asia/Dhaka', 'YYYY-MM-DD')`,
      segments: sum(smsMessages.segments),
    })
    .from(smsMessages)
    .where(gte(smsMessages.createdAt, since))
    .groupBy(sql`1`);
}

/** One entry per day for the last 14 days (Dhaka dates), zero where nothing was sent. */
function fillDays(rows: { day: string; segments: string | null }[], now: number) {
  const byDay = new Map(rows.map((d) => [d.day, Number(d.segments ?? 0)]));
  return Array.from({ length: 14 }, (_, i) => {
    const key = new Date(now + DHAKA_OFFSET_MS - (13 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day: key, sms: byDay.get(key) ?? 0 };
  });
}

/** SMS parts sent per day over the last 14 days, for the overview chart. */
export async function getSmsDaily(now: number) {
  return fillDays(await getDailyRows(new Date(now - 13 * 86_400_000)), now);
}

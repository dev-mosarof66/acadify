import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";

import { adminLoginCodes, db } from "@/lib/db";
import { sendEmail } from "@/lib/email/brevo";
import { authEmail } from "@/lib/email/templates";

/*
 * Second sign-in step for admin accounts (super admins, principals, institute admins).
 * After the password check, a 6-digit code is emailed; entering it sets a signed cookie tied to that
 * Neon Auth session. Admin areas stay locked for the session until the cookie is present and valid.
 */

const COOKIE = "acadify_admin_verified";
const CODE_TTL_MS = 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
/** At most this many codes per user in RATE_WINDOW_MS, so the form can't be used to flood an inbox. */
const MAX_CODES = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;
/** Verification lasts as long as the session, but never more than this. */
const VERIFIED_MAX_MS = 12 * 60 * 60 * 1000;

function secret() {
  const s = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!s) throw new Error("NEON_AUTH_COOKIE_SECRET is not set");
  return s;
}

const hmac = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const hashCode = (sessionId: string, code: string) => hmac(`code:${sessionId}:${code}`);

/* ---------------------------------------------------------------- verified cookie */

export async function isAdminVerified(userId: string, sessionId: string) {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [sid, exp, sig] = value.split(".");
  if (!sid || !exp || !sig || sid !== sessionId) return false;
  if (Number(exp) < Date.now()) return false;
  return safeEqual(sig, hmac(`verified:${userId}:${sid}:${exp}`));
}

async function markVerified(userId: string, sessionId: string, sessionExpires?: Date | string | null) {
  const sessionEnd = sessionExpires ? new Date(sessionExpires).getTime() : Infinity;
  const exp = Math.min(Date.now() + VERIFIED_MAX_MS, sessionEnd);
  (await cookies()).set(COOKIE, `${sessionId}.${exp}.${hmac(`verified:${userId}:${sessionId}:${exp}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function clearAdminVerified() {
  (await cookies()).delete(COOKIE);
}

/* ---------------------------------------------------------------- codes */

export type CodeOwner = { userId: string; sessionId: string; sessionExpires?: Date | string | null; email: string; name?: string | null };

export type SendCodeResult = { ok: true; sent: boolean; retryInSeconds: number } | { ok: false; code: "rate" | "send-failed" };

/**
 * Emails a fresh code unless one went out for this session in the last minute (then `sent: false`,
 * so a page reload doesn't send a second email).
 */
export async function sendAdminCode(owner: CodeOwner, opts: { force?: boolean } = {}): Promise<SendCodeResult> {
  const now = Date.now();
  const [latest] = await db
    .select({ createdAt: adminLoginCodes.createdAt })
    .from(adminLoginCodes)
    .where(and(eq(adminLoginCodes.sessionId, owner.sessionId), isNull(adminLoginCodes.usedAt)))
    .orderBy(desc(adminLoginCodes.createdAt))
    .limit(1);

  const age = latest ? now - latest.createdAt.getTime() : Infinity;
  if (age < RESEND_AFTER_MS) {
    const retryInSeconds = Math.ceil((RESEND_AFTER_MS - age) / 1000);
    return opts.force ? { ok: false, code: "rate" } : { ok: true, sent: false, retryInSeconds };
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(adminLoginCodes)
    .where(and(eq(adminLoginCodes.userId, owner.userId), gt(adminLoginCodes.createdAt, new Date(now - RATE_WINDOW_MS))));
  if (n >= MAX_CODES) return { ok: false, code: "rate" };

  // Only the newest code for a session works
  await db
    .update(adminLoginCodes)
    .set({ usedAt: new Date(now) })
    .where(and(eq(adminLoginCodes.sessionId, owner.sessionId), isNull(adminLoginCodes.usedAt)));

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(now + CODE_TTL_MS);
  await db.insert(adminLoginCodes).values({ userId: owner.userId, sessionId: owner.sessionId, codeHash: hashCode(owner.sessionId, code), expiresAt });

  const h = await headers();
  const email = authEmail({
    type: "admin-sign-in",
    email: owner.email,
    name: owner.name,
    code,
    expiresAt: expiresAt.toISOString(),
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  });
  const result = await sendEmail({ to: { email: owner.email, name: owner.name ?? undefined }, ...email });
  if (!result.ok) return { ok: false, code: "send-failed" };
  return { ok: true, sent: true, retryInSeconds: RESEND_AFTER_MS / 1000 };
}

export type CheckCodeResult = { ok: true } | { ok: false; code: "bad-code" | "expired" };

/** Checks a code for this session; on success the session is marked verified. */
export async function checkAdminCode(owner: CodeOwner, code: string): Promise<CheckCodeResult> {
  if (!/^\d{6}$/.test(code)) return { ok: false, code: "bad-code" };

  const [row] = await db
    .select()
    .from(adminLoginCodes)
    .where(and(eq(adminLoginCodes.sessionId, owner.sessionId), eq(adminLoginCodes.userId, owner.userId), isNull(adminLoginCodes.usedAt)))
    .orderBy(desc(adminLoginCodes.createdAt))
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now() || row.attempts >= MAX_ATTEMPTS) return { ok: false, code: "expired" };

  if (!safeEqual(row.codeHash, hashCode(owner.sessionId, code))) {
    const attempts = row.attempts + 1;
    await db
      .update(adminLoginCodes)
      .set({ attempts, ...(attempts >= MAX_ATTEMPTS ? { usedAt: new Date() } : {}) })
      .where(eq(adminLoginCodes.id, row.id));
    return { ok: false, code: attempts >= MAX_ATTEMPTS ? "expired" : "bad-code" };
  }

  await db.update(adminLoginCodes).set({ usedAt: new Date() }).where(eq(adminLoginCodes.id, row.id));
  await markVerified(owner.userId, owner.sessionId, owner.sessionExpires);
  return { ok: true };
}

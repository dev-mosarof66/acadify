import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { neonBranchApi } from "@/lib/neon-api";

/** Neon Auth user id for an email, or null if nobody has signed up with it. */
export async function findAuthUserId(email: string): Promise<string | null> {
  const rows = await db.execute<{ id: string }>(sql`select id::text as id from neon_auth."user" where lower(email) = ${email.toLowerCase()} limit 1`);
  return rows.rows[0]?.id ?? null;
}

/**
 * Creates a sign-in account with no password. The person sets their own with "Forgot password?"
 * (the welcome email links straight to it). Works from any server context, not only a super admin's session.
 */
export async function createAuthUser(email: string, name: string): Promise<string> {
  const { id } = await neonBranchApi<{ id: string }>("/auth/users", { method: "POST", body: JSON.stringify({ email, name }) });
  return id;
}

/** The account for this email, creating one if needed. */
export async function ensureAuthUser(email: string, name: string): Promise<{ id: string; created: boolean }> {
  const existing = await findAuthUserId(email);
  if (existing) return { id: existing, created: false };
  return { id: await createAuthUser(email, name), created: true };
}

/** True if another account already uses this E.164 number. */
export async function phoneInUse(e164: string): Promise<boolean> {
  const rows = await db.execute<{ id: string }>(sql`select id::text as id from neon_auth."user" where "phoneNumber" = ${e164} limit 1`);
  return rows.rows.length > 0;
}

/**
 * Links a verified mobile number so the person can sign in with a code sent by SMS. The office vouches for the
 * number, so no code is sent to confirm it. Only used on accounts created in the same request: a number is never
 * attached to an account that already existed (otherwise staff could point someone else's account at their own phone).
 */
export async function linkPhone(userId: string, e164: string): Promise<boolean> {
  try {
    const res = await db.execute(
      sql`update neon_auth."user" set "phoneNumber" = ${e164}, "phoneNumberVerified" = true, "updatedAt" = now() where id::text = ${userId} and "phoneNumber" is null`
    );
    return (res.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

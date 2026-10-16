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

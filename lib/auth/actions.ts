"use server";

import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { checkAdminCode, clearAdminVerified, sendAdminCode } from "./admin-code";
import { clearResetWindow, markResetCodeSent, markResetCodeVerified, resetCodeStillValid, resetCodeVerified } from "./reset-window";
import { auth } from "./server";
import { isSuperAdmin, needsAdminCode } from "./rbac";
import { getMemberships, getViewer, hasSuperAdmin, homeFor, touchInstituteActivity } from "./session";

/** Error codes the auth forms translate into messages (keeps server text out of the UI). */
export type AuthErrorCode =
  | "invalid"
  | "banned"
  | "unverified"
  | "rate"
  | "network"
  | "forbidden"
  | "no-institute"
  | "weak-password"
  | "bad-code"
  | "expired"
  | "send-failed"
  | "setup-token"
  | "setup-done"
  | "exists"
  | "unknown";

export type AuthResult = { ok: true } | { ok: false; code: AuthErrorCode };

type UpstreamError = { code?: string; status?: number; message?: string } | null | undefined;

function mapError(error: UpstreamError): AuthErrorCode {
  const code = (error?.code ?? "").toUpperCase();
  if (code.startsWith("NETWORK_")) return "network";
  if (code.includes("INVALID_EMAIL_OR_PASSWORD") || code.includes("INVALID_PASSWORD") || code.includes("USER_NOT_FOUND")) return "invalid";
  if (code.includes("BANNED")) return "banned";
  if (code.includes("EMAIL_NOT_VERIFIED")) return "unverified";
  if (code.includes("TOO_MANY") || error?.status === 429) return "rate";
  if (code.includes("INVALID_OTP") || code.includes("OTP_EXPIRED") || code.includes("INVALID_CODE")) return "bad-code";
  if (code.includes("PASSWORD_TOO") || code.includes("WEAK")) return "weak-password";
  if (code.includes("ALREADY_EXISTS") || code.includes("USER_ALREADY")) return "exists";
  if (error?.status === 401) return "invalid";
  // A 403 here is usually "origin not trusted" (the site's address isn't in Neon Auth's trusted domains).
  // It must not look like a wrong password or an unknown account, so log it where the host's logs show it.
  console.error(`[auth] Neon Auth refused the request: status ${error?.status ?? "?"}, code ${error?.code ?? "?"}. If this is a 403, add the site's address under Neon Auth trusted domains.`);
  return "unknown";
}

const field = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same rule the reset form shows: 8+ chars with lowercase, uppercase, number and special character. */
function isStrongPassword(pw: string) {
  return pw.length >= 8 && /[a-zঀ-৿]/.test(pw) && /[A-Z]/.test(pw) && /[0-9০-৯]/.test(pw) && /[^\p{L}\p{M}0-9০-৯\s]/u.test(pw);
}

/* ---------------------------------------------------------------------------- */

/**
 * One sign-in for everyone; RBAC decides where the account goes.
 *  - Super admins, principals and institute admins continue to /login/verify for an emailed code.
 *  - Other institute members go straight to /dashboard.
 *  - Accounts with no role anywhere are signed out again.
 */
export async function signInAction(form: FormData): Promise<AuthResult> {
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const rememberMe = form.get("remember") === "on" || form.get("remember") === "true";
  if (!EMAIL.test(email) || !password) return { ok: false, code: "invalid" };

  const { data, error } = await auth.signIn.email({ email, password, rememberMe });
  if (error || !data?.user) return { ok: false, code: mapError(error) };

  const user = data.user as { id: string; role?: string | null };
  const memberships = await getMemberships(user.id);
  if (!isSuperAdmin(user.role) && !memberships.length) {
    await auth.signOut();
    return { ok: false, code: "no-institute" };
  }
  // A new sign-in always needs a new code, even if an old verification cookie is still around
  await clearAdminVerified();
  await touchInstituteActivity(user.id, memberships.map((m) => m.instituteId));
  if (needsAdminCode(user.role, memberships.map((m) => m.role))) redirect("/login/verify");
  redirect("/dashboard");
}

/**
 * Second half of signing in with a mobile number. The browser sends the SMS code to Neon Auth (which sets the
 * session), then calls this so a phone sign-in goes through the same checks and routing as email and password.
 */
export async function completePhoneSignInAction(): Promise<AuthResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, code: "invalid" };
  if (!viewer.isSuperAdmin && !viewer.memberships.length) {
    await auth.signOut();
    return { ok: false, code: "no-institute" };
  }
  await clearAdminVerified();
  await touchInstituteActivity(viewer.id, viewer.memberships.map((m) => m.instituteId));
  redirect(viewer.needsAdminCode ? "/login/verify" : "/dashboard");
}

export async function signOutAction() {
  await auth.signOut();
  await clearAdminVerified();
  redirect("/login");
}

/* ---------------------------------------------------------------------------- *
 * Admin sign-in code (second step for admin accounts)
 * ---------------------------------------------------------------------------- */

export type AdminCodeSendResult = { ok: true; retryInSeconds: number } | { ok: false; code: AuthErrorCode };

/** Emails the code. Without `resend`, a code sent in the last minute is reused (page reloads don't send again). */
export async function sendAdminCodeAction(resend = false): Promise<AdminCodeSendResult> {
  const viewer = await getViewer();
  if (!viewer?.needsAdminCode) return { ok: false, code: "forbidden" };
  if (viewer.adminVerified) redirect(homeFor(viewer));

  const result = await sendAdminCode(
    { userId: viewer.id, sessionId: viewer.sessionId, sessionExpires: viewer.sessionExpires, email: viewer.email, name: viewer.name },
    { force: resend }
  );
  return result.ok ? { ok: true, retryInSeconds: result.retryInSeconds } : { ok: false, code: result.code };
}

export async function verifyAdminCodeAction(code: string): Promise<AuthResult> {
  const viewer = await getViewer();
  if (!viewer?.needsAdminCode) return { ok: false, code: "forbidden" };
  if (viewer.adminVerified) redirect(homeFor(viewer));

  const result = await checkAdminCode(
    { userId: viewer.id, sessionId: viewer.sessionId, sessionExpires: viewer.sessionExpires, email: viewer.email, name: viewer.name },
    code.trim()
  );
  if (!result.ok) return result;
  redirect(homeFor(viewer));
}

/* ---------------------------------------------------------------------------- *
 * Forgot password (Email OTP). Responses never reveal whether an email exists.
 * ---------------------------------------------------------------------------- */

export async function sendResetCode(email: string): Promise<AuthResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL.test(clean)) return { ok: false, code: "invalid" };
  const { error } = await auth.emailOtp.sendVerificationOtp({ email: clean, type: "forget-password" });
  if (error) {
    const code = mapError(error);
    // Unknown accounts look like success so the form can't be used to discover emails
    if (code !== "invalid") return { ok: false, code };
  }
  // Starts the 60-second window (also for unknown emails, so both cases behave the same)
  await markResetCodeSent(clean);
  return { ok: true };
}

export async function verifyResetCode(email: string, otp: string): Promise<AuthResult> {
  const clean = email.trim().toLowerCase();
  if (!(await resetCodeStillValid(clean))) return { ok: false, code: "expired" };
  const { data, error } = await auth.emailOtp.checkVerificationOtp({ email: clean, otp, type: "forget-password" });
  if (error) return { ok: false, code: mapError(error) === "unknown" ? "bad-code" : mapError(error) };
  if ((data as { success?: boolean } | null)?.success === false) return { ok: false, code: "bad-code" };
  await markResetCodeVerified(clean);
  return { ok: true };
}

export async function resetPasswordWithCode(email: string, otp: string, password: string): Promise<AuthResult> {
  if (!isStrongPassword(password)) return { ok: false, code: "weak-password" };
  // The code itself had to be entered within 60 seconds (verifyResetCode); this is the time to pick a password
  if (!(await resetCodeVerified(email.trim().toLowerCase()))) return { ok: false, code: "expired" };
  // Called directly: @neondatabase/auth 0.6.0-beta maps emailOtp.resetPassword to "email-otp/passcode", which 404s
  let error: UpstreamError = null;
  try {
    const res = await fetch(`${process.env.NEON_AUTH_BASE_URL}/email-otp/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "") },
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp, password }),
      cache: "no-store",
    });
    if (!res.ok) error = { ...((await res.json().catch(() => ({}))) as { code?: string; message?: string }), status: res.status };
  } catch {
    error = { code: "NETWORK_ERROR" };
  }
  if (error) return { ok: false, code: mapError(error) === "unknown" ? "bad-code" : mapError(error) };
  await clearResetWindow();
  return { ok: true };
}

/* ---------------------------------------------------------------------------- *
 * First super admin. Only works while no admin exists, and needs ADMIN_SETUP_TOKEN.
 * ---------------------------------------------------------------------------- */

function tokenMatches(given: string) {
  const expected = process.env.ADMIN_SETUP_TOKEN ?? "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function setupFirstAdmin(form: FormData): Promise<AuthResult> {
  if (!tokenMatches(field(form, "token"))) return { ok: false, code: "setup-token" };
  if (await hasSuperAdmin()) return { ok: false, code: "setup-done" };

  const name = field(form, "name");
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !EMAIL.test(email)) return { ok: false, code: "invalid" };
  if (!isStrongPassword(password)) return { ok: false, code: "weak-password" };

  const { data, error } = await auth.signUp.email({ email, password, name });
  if (error || !data?.user) return { ok: false, code: mapError(error) };

  // Promote only if nobody became admin in the meantime
  await db.execute(sql`
    update neon_auth."user" set role = 'admin'
    where id = ${data.user.id} and not exists (select 1 from neon_auth."user" where role = 'admin')
  `);

  // Fresh session so the cached session data carries the admin role
  await auth.signOut();
  const signIn = await auth.signIn.email({ email, password });
  if (signIn.error) return { ok: false, code: mapError(signIn.error) };
  redirect("/login/verify");
}

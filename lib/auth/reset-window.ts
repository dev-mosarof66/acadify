import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/*
 * Neon Auth's password-reset codes live longer than Acadify allows, and Neon has no setting for it.
 * This signed cookie records when this browser was sent a code (and when it was verified), so the app
 * refuses a code entered more than CODE_SECONDS after it was sent.
 */

/** A code must be entered within this many seconds of being sent. */
export const CODE_SECONDS = 60;
/** After the code is accepted, time allowed to choose the new password. */
const CHOOSE_PASSWORD_MS = 10 * 60 * 1000;
const COOKIE = "acadify_reset";

const sign = (value: string) => createHmac("sha256", process.env.NEON_AUTH_COOKIE_SECRET ?? "").update(`reset:${value}`).digest("base64url");

type State = { email: string; sentAt: number; verifiedAt?: number };

async function read(): Promise<State | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(body);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as State;
  } catch {
    return null;
  }
}

async function write(state: State) {
  const body = Buffer.from(JSON.stringify(state)).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHOOSE_PASSWORD_MS / 1000,
  });
}

export async function markResetCodeSent(email: string) {
  await write({ email, sentAt: Date.now() });
}

/** True while the latest code sent to this email is younger than CODE_SECONDS. */
export async function resetCodeStillValid(email: string) {
  const s = await read();
  return !!s && s.email === email && Date.now() - s.sentAt <= CODE_SECONDS * 1000;
}

export async function markResetCodeVerified(email: string) {
  const s = await read();
  if (s?.email === email) await write({ ...s, verifiedAt: Date.now() });
}

/** True when this browser verified a code for this email recently (the new-password step). */
export async function resetCodeVerified(email: string) {
  const s = await read();
  return !!s?.verifiedAt && s.email === email && Date.now() - s.verifiedAt <= CHOOSE_PASSWORD_MS;
}

export async function clearResetWindow() {
  (await cookies()).delete(COOKIE);
}

import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const secret = process.env.NEON_AUTH_COOKIE_SECRET;
if (!baseUrl || !secret) {
  throw new Error("NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must be set in .env.local.");
}

/** Neon Auth (managed Better Auth): session cookies, sign-in/out, Email OTP, admin and organization APIs. */
export const auth = createNeonAuth({
  baseUrl,
  cookies: { secret },
  logLevel: process.env.NODE_ENV === "production" ? "warn" : "info",
});

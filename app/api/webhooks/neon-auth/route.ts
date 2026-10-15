import crypto from "node:crypto";

import { sendEmail } from "@/lib/email/brevo";
import { authEmail, type AuthEmailType } from "@/lib/email/templates";

/**
 * Neon Auth webhook: delivers verification, password-reset and sign-in emails with Acadify's own templates.
 * Neon calls this instead of sending its default email once `send.otp` / `send.magic_link` are subscribed
 * (npm run email:setup -- --webhook https://<your-domain>/api/webhooks/neon-auth).
 *
 * A non-2xx response makes Neon retry (up to 3 times within 15s) and then fail the auth flow, so Brevo
 * errors return 502 rather than silently dropping the code.
 */

type Jwk = crypto.JsonWebKey & { kid?: string };
type NeonEvent = {
  event_id: string;
  event_type: string;
  user?: { email?: string; name?: string | null };
  event_data?: {
    otp_code?: string;
    otp_type?: AuthEmailType;
    link_type?: AuthEmailType;
    link_url?: string;
    delivery_preference?: "email" | "sms";
    expires_at?: string;
    ip_address?: string;
    user_agent?: string;
  };
};

const MAX_AGE_MS = 5 * 60 * 1000;
const AUTH_TYPES: AuthEmailType[] = ["email-verification", "forget-password", "sign-in"];

let jwksCache: { keys: Jwk[]; at: number } | null = null;

async function publicKey(kid: string) {
  const find = () => jwksCache?.keys.find((k) => k.kid === kid);
  // Refetch on an unknown kid (key rotation), at most once every 30s
  if (!find() && (!jwksCache || Date.now() - jwksCache.at > 30_000)) {
    const res = await fetch(`${process.env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`, { cache: "no-store" });
    if (res.ok) jwksCache = { keys: ((await res.json()) as { keys: Jwk[] }).keys, at: Date.now() };
  }
  const jwk = find();
  return jwk ? crypto.createPublicKey({ key: jwk, format: "jwk" }) : null;
}

async function verify(rawBody: string, headers: Headers) {
  const signature = headers.get("x-neon-signature");
  const kid = headers.get("x-neon-signature-kid");
  const timestamp = headers.get("x-neon-timestamp");
  if (!signature || !kid || !timestamp) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > MAX_AGE_MS) return false;

  const [headerB64, emptyPayload, signatureB64] = signature.split(".");
  if (!headerB64 || emptyPayload !== "" || !signatureB64) return false;

  const key = await publicKey(kid);
  if (!key) return false;

  // Detached JWS over "<timestamp>.<base64url(body)>", itself base64url-encoded
  const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url");
  const signingInput = `${headerB64}.${Buffer.from(`${timestamp}.${payloadB64}`, "utf8").toString("base64url")}`;
  try {
    return crypto.verify(null, Buffer.from(signingInput), key, Buffer.from(signatureB64, "base64url"));
  } catch {
    return false;
  }
}

/** Event ids already delivered by this server instance, so Neon's retries don't send a second email. */
const delivered = new Map<string, number>();
function alreadyDelivered(id: string) {
  const now = Date.now();
  for (const [k, at] of delivered) if (now - at > MAX_AGE_MS) delivered.delete(k);
  return delivered.has(id);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verify(rawBody, request.headers))) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as NeonEvent;
  const data = event.event_data ?? {};
  const email = event.user?.email;

  if (event.event_type !== "send.otp" && event.event_type !== "send.magic_link") return Response.json({ ok: true, ignored: true });
  if (data.delivery_preference === "sms") return Response.json({ ok: true, ignored: "sms" });
  if (!email) return Response.json({ error: "no recipient" }, { status: 400 });
  if (alreadyDelivered(event.event_id)) return Response.json({ ok: true, duplicate: true });

  const type = event.event_type === "send.otp" ? data.otp_type : data.link_type;
  if (!type || !AUTH_TYPES.includes(type)) return Response.json({ error: "unknown email type" }, { status: 400 });

  const common = { type, email, name: event.user?.name, expiresAt: data.expires_at, ipAddress: data.ip_address, userAgent: data.user_agent };
  let message;
  if (event.event_type === "send.otp") {
    if (!data.otp_code) return Response.json({ error: "no code" }, { status: 400 });
    message = authEmail({ ...common, code: data.otp_code });
  } else {
    if (!data.link_url?.startsWith("https://") && !data.link_url?.startsWith("http://")) return Response.json({ error: "no link" }, { status: 400 });
    message = authEmail({ ...common, link: data.link_url });
  }

  const result = await sendEmail({ to: { email, name: event.user?.name ?? undefined }, ...message });
  if (!result.ok) return Response.json({ error: "email not sent" }, { status: 502 });

  delivered.set(event.event_id, Date.now());
  return Response.json({ ok: true });
}

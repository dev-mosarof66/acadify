import "server-only";

/**
 * App emails (welcome, demo-request alerts) sent through Brevo's transactional API.
 * Auth emails (reset codes, verification) go through Neon Auth's SMTP instead — see scripts/setup-email-provider.ts.
 *
 * Needs BREVO_API_KEY and EMAIL_FROM. Without them, emails are skipped (logged) so local dev keeps working.
 */

type Recipient = { email: string; name?: string };

export type SendEmailInput = {
  to: Recipient | Recipient[];
  subject: string;
  html: string;
  text: string;
  replyTo?: Recipient;
};

export type SendEmailResult = { ok: true; messageId?: string } | { ok: false; skipped?: true; error: string };

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn(`[email] BREVO_API_KEY or EMAIL_FROM not set; skipped "${subject}"`);
    return { ok: false, skipped: true, error: "Email is not configured." };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: process.env.EMAIL_FROM_NAME || "Acadify" },
        to: Array.isArray(to) ? to : [to],
        subject,
        htmlContent: html,
        textContent: text,
        ...(replyTo ? { replyTo } : {}),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string };
    if (!res.ok) {
      console.error(`[email] Brevo ${res.status}: ${body.message ?? res.statusText}`);
      return { ok: false, error: body.message ?? "Brevo rejected the email." };
    }
    return { ok: true, messageId: body.messageId };
  } catch (err) {
    console.error("[email] Brevo request failed", err);
    return { ok: false, error: "Couldn't reach Brevo." };
  }
}

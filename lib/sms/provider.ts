import "server-only";

/*
 * SMS provider slot. Acadify sends every SMS through `getSmsProvider()`; until a provider is added here,
 * the gateway shows "Not connected" and nothing is sent.
 *
 * To connect one (SSL Wireless, BulkSMSBD, Alpha SMS…):
 *   1. Add an adapter below that calls the provider's API and returns { ok, id } or { ok: false, error }.
 *   2. Register it in ADAPTERS under a short name.
 *   3. Set SMS_PROVIDER=<that name> and the provider's API key (e.g. SMS_API_KEY) in the environment.
 */

export type SmsSendResult = { ok: true; providerMessageId?: string } | { ok: false; error: string };

export interface SmsProvider {
  /** Shown in the console, e.g. "SSL Wireless". */
  label: string;
  /** `to` is an international BD number without "+", e.g. 8801712345678. */
  send(to: string, body: string, senderId: string): Promise<SmsSendResult>;
}

const ADAPTERS: Record<string, () => SmsProvider | null> = {
  // e.g. "ssl": () => (process.env.SMS_API_KEY ? sslWireless(process.env.SMS_API_KEY) : null),
};

/** The configured provider, or null when none is connected yet. */
export function getSmsProvider(): SmsProvider | null {
  const name = process.env.SMS_PROVIDER?.trim();
  if (!name) return null;
  return ADAPTERS[name]?.() ?? null;
}

export type ProviderStatus = { connected: true; label: string } | { connected: false; reason: string };

export function smsProviderStatus(): ProviderStatus {
  const name = process.env.SMS_PROVIDER?.trim();
  if (!name) return { connected: false, reason: "No SMS provider is set up yet." };
  const provider = getSmsProvider();
  if (!provider) return { connected: false, reason: `SMS_PROVIDER is "${name}", but there's no adapter for it yet, or its API key is missing.` };
  return { connected: true, label: provider.label };
}

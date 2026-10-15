import { BD_MOBILE, localMobile } from "@/lib/institute/rules";

/** "01712-345678" / "+880 1712 345678" → "+8801712345678" (E.164, the form Neon Auth stores), or null. */
export function toE164(input: string): string | null {
  const local = localMobile(input);
  return BD_MOBILE.test(local) ? `+88${local}` : null;
}

/** "+8801712345678" → "01712••••78", for showing which number a code went to. */
export function maskPhone(e164: string) {
  const local = e164.replace(/^\+88/, "");
  return `${local.slice(0, 5)}••••${local.slice(-2)}`;
}

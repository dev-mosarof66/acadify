/** Platform settings as the app uses them (safe to pass to Client Components). */
export interface PlatformSettings {
  trialDays: number;
  paymentInstructions: string;
  supportEmail: string;
  salesEmail: string;
  phone: string;
  whatsapp: string;
  office: string;
  officeBn: string;
  /** Sender name/number on outgoing SMS. */
  smsSenderId: string;
  /** Price of one SMS part in poisha (৳1 = 100); 0 = not set yet. */
  smsRatePoisha: number;
}

/** Used until the settings row is readable (and as the form's starting values). */
export const DEFAULT_SETTINGS: PlatformSettings = {
  trialDays: 30,
  paymentInstructions: "",
  supportEmail: "support@acadify.app",
  salesEmail: "sales@acadify.app",
  phone: "",
  whatsapp: "",
  office: "",
  officeBn: "",
  smsSenderId: "",
  smsRatePoisha: 0,
};

/** "01712-345678" / "+880 1712 345678" → "8801712345678" (international digits), or "" if it isn't a BD mobile. */
export function bdMobileDigits(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (/^01[3-9]\d{8}$/.test(d)) return `88${d}`;
  if (/^8801[3-9]\d{8}$/.test(d)) return d;
  return "";
}

export const telHref = (phone: string) => (bdMobileDigits(phone) ? `tel:+${bdMobileDigits(phone)}` : "");
export const whatsappHref = (phone: string) => (bdMobileDigits(phone) ? `https://wa.me/${bdMobileDigits(phone)}` : "");

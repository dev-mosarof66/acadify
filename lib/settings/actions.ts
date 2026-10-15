"use server";

import { revalidatePath, updateTag } from "next/cache";

import { assertSuperAdmin } from "@/lib/auth/session";
import { db, platformSettings } from "@/lib/db";
import { SETTINGS_TAG } from "./queries";
import { bdMobileDigits } from "./types";

export type SettingsResult = { ok: true } | { ok: false; error: string; field?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

export async function saveSettings(form: FormData): Promise<SettingsResult> {
  await assertSuperAdmin();
  const get = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);

  const trialDays = Number(toAsciiDigits(get("trialDays")));
  const values = {
    trialDays,
    paymentInstructions: get("paymentInstructions", 1500),
    supportEmail: get("supportEmail").toLowerCase(),
    salesEmail: get("salesEmail").toLowerCase(),
    phone: toAsciiDigits(get("phone", 30)),
    whatsapp: toAsciiDigits(get("whatsapp", 30)),
    office: get("office"),
    officeBn: get("officeBn"),
  };

  if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 365) {
    return { ok: false, error: "The free trial needs a length between 1 and 365 days.", field: "trialDays" };
  }
  if (!EMAIL.test(values.supportEmail)) return { ok: false, error: "Enter a valid support email.", field: "supportEmail" };
  if (!EMAIL.test(values.salesEmail)) return { ok: false, error: "Enter a valid sales email.", field: "salesEmail" };
  if (values.phone && !bdMobileDigits(values.phone)) return { ok: false, error: "Enter the phone as a Bangladeshi mobile number (01XXXXXXXXX), or leave it empty.", field: "phone" };
  if (values.whatsapp && !bdMobileDigits(values.whatsapp)) {
    return { ok: false, error: "Enter the WhatsApp number as a Bangladeshi mobile number (01XXXXXXXXX), or leave it empty.", field: "whatsapp" };
  }

  await db
    .insert(platformSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: platformSettings.id, set: values });

  // The website's contact and legal pages, invoices and the console all read these
  updateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true };
}

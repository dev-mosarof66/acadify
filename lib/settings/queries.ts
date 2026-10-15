import "server-only";

import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db, platformSettings } from "@/lib/db";
import { DEFAULT_SETTINGS, type PlatformSettings } from "./types";

/** Cache tag for the settings; saveSettings calls updateTag(SETTINGS_TAG). */
export const SETTINGS_TAG = "platform-settings";

/** The platform settings (cached until they're saved again). */
export async function getSettings(): Promise<PlatformSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("max");
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  if (!row) return DEFAULT_SETTINGS;
  return {
    trialDays: row.trialDays,
    paymentInstructions: row.paymentInstructions,
    supportEmail: row.supportEmail,
    salesEmail: row.salesEmail,
    phone: row.phone,
    whatsapp: row.whatsapp,
    office: row.office,
    officeBn: row.officeBn,
    smsSenderId: row.smsSenderId,
    smsRatePoisha: row.smsRatePoisha,
  };
}

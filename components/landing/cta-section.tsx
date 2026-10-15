import { CtaBand } from "@/components/landing/cta-band";
import { getSettings } from "@/lib/settings/queries";

/** The call-to-action band, with the free trial length from Platform Settings. */
export default async function CtaSection() {
  const { trialDays } = await getSettings();
  return <CtaBand trialDays={trialDays} />;
}

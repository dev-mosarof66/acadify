import type { Metadata } from "next";
import LegalPage from "@/components/company/legal-page";
import { getSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Refund Policy — Acadify",
  description: "When and how Acadify payments can be refunded.",
};

export default async function Page() {
  const settings = await getSettings();
  return <LegalPage doc="refund" supportEmail={settings.supportEmail} trialDays={settings.trialDays} />;
}

import type { Metadata } from "next";
import LegalPage from "@/components/company/legal-page";
import { getSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Privacy Policy — Acadify",
  description: "How Acadify collects, uses and protects your institute's data.",
};

export default async function Page() {
  const settings = await getSettings();
  return <LegalPage doc="privacy" supportEmail={settings.supportEmail} trialDays={settings.trialDays} />;
}

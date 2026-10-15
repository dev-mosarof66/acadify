import type { Metadata } from "next";
import LegalPage from "@/components/company/legal-page";
import { getSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Terms of Service — Acadify",
  description: "The agreement between your institute and Acadify.",
};

export default async function Page() {
  const settings = await getSettings();
  return <LegalPage doc="terms" supportEmail={settings.supportEmail} trialDays={settings.trialDays} />;
}

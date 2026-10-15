import type { Metadata } from "next";
import AboutPage from "@/components/company/about-page";
import { getSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "About Us — Acadify",
  description: "Acadify is an institutional operating system built in Bangladesh for schools, colleges and madrasahs.",
};

export default async function Page() {
  const { trialDays } = await getSettings();
  return <AboutPage trialDays={trialDays} />;
}

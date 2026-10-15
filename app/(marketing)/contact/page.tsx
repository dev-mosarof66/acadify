import type { Metadata } from "next";
import ContactPage from "@/components/company/contact-page";
import { getSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Contact Us — Acadify",
  description: "Book a free Acadify demo, ask about pricing or get support in Bangla and English.",
};

export default async function Page() {
  const settings = await getSettings();
  return <ContactPage contact={settings} />;
}

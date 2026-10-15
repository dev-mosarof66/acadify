import { SettingsForm } from "@/components/super-admin/settings-form";
import { PageHeader } from "@/components/super-admin/ui";
import { getSettings } from "@/lib/settings/queries";

export const metadata = { title: "Platform Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Platform Settings" description="Free trial, invoice payment details and the contact details shown on the website" />
      <SettingsForm settings={settings} />
    </>
  );
}

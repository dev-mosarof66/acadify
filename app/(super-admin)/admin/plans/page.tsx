import { NewPlanButton, PlansBoard } from "@/components/super-admin/plans-board";
import { PageHeader } from "@/components/super-admin/ui";
import { getPlansWithUsage } from "@/lib/plans/queries";
import { getSettings } from "@/lib/settings/queries";

export const metadata = { title: "Plans & Pricing" };

export default async function PlansPage() {
  const [plans, settings] = await Promise.all([getPlansWithUsage(), getSettings()]);
  const shown = plans.filter((p) => p.isPublic && p.isActive).length;

  return (
    <>
      <PageHeader
        title="Plans & Pricing"
        description={`${plans.length} plans · ${shown} shown on the website's pricing section`}
        actions={<NewPlanButton trialDays={settings.trialDays} />}
      />
      <PlansBoard plans={plans} trialDays={settings.trialDays} />
    </>
  );
}

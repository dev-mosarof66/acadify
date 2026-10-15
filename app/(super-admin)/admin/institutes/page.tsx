import { AlertTriangle, Building2, CircleCheck, Hourglass } from "lucide-react";

import { AddInstituteButton } from "@/components/super-admin/institute-actions";
import { InstitutesTable } from "@/components/super-admin/institutes-table";
import { PageHeader, StatCard } from "@/components/super-admin/ui";
import { daysUntil, formatNumber } from "@/lib/super-admin/data";
import { getPlans } from "@/lib/plans/queries";
import { getSettings } from "@/lib/settings/queries";
import { getDemoRequestById, getInstitutes, getPlatformTotals, getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: "Institutes" };

export default async function InstitutesPage({ searchParams }: PageProps<"/admin/institutes">) {
  // ?from=<demo request id> opens "Add institute" filled in from that request
  const from = Number((await searchParams).from);
  const [totals, institutes, now, demo, plans, settings] = await Promise.all([
    getPlatformTotals(),
    getInstitutes(),
    getRequestTime(),
    getDemoRequestById(from),
    getPlans(),
    getSettings(),
  ]);
  const monthPrefix = new Date(now).toISOString().slice(0, 7);
  const joinedThisMonth = institutes.filter((i) => i.joined.startsWith(monthPrefix)).length;
  const trialsEndingSoon = institutes.filter((i) => i.status === "trial" && daysUntil(i.renewsOn, now) <= 21).length;
  const activeShare = totals.institutes ? Math.round((totals.active / totals.institutes) * 100) : 0;

  const prefill = demo
    ? { name: demo.instituteName, type: demo.type, contactName: demo.name, contactPhone: demo.phone, contactEmail: demo.email ?? undefined }
    : undefined;

  return (
    <>
      <PageHeader
        title="Institutes"
        description={`${totals.institutes} institutes on Acadify · ${totals.active} active, ${totals.trials} on trial, ${totals.pastDue} past due`}
        actions={<AddInstituteButton key={demo?.id ?? "new"} prefill={prefill} fromDemo={demo?.id} plans={plans} trialDays={settings.trialDays} />}
      />

      <section aria-label="Institute summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total institutes"
          value={formatNumber(totals.institutes)}
          icon={Building2}
          note={`${formatNumber(totals.students)} students in total`}
          trend={joinedThisMonth ? { value: `${joinedThisMonth} joined`, up: true } : undefined}
        />
        <StatCard label="Active" value={formatNumber(totals.active)} icon={CircleCheck} note={`${activeShare}% of all institutes, paying on time`} />
        <StatCard
          label="On free trial"
          value={formatNumber(totals.trials)}
          icon={Hourglass}
          note={
            trialsEndingSoon ? `${trialsEndingSoon} ${trialsEndingSoon === 1 ? "trial ends" : "trials end"} within 3 weeks` : "No trials ending soon"
          }
        />
        <StatCard
          label="Need follow-up"
          value={formatNumber(totals.pastDue + totals.suspended)}
          icon={AlertTriangle}
          note={`${totals.pastDue} past due · ${totals.suspended} suspended`}
        />
      </section>

      <InstitutesTable institutes={institutes} now={now} plans={plans} />
    </>
  );
}

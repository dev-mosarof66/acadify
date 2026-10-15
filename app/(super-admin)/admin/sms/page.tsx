import { AlertTriangle, MessageSquareText, Wallet, Wallet2 } from "lucide-react";

import { SmsChart } from "@/components/super-admin/charts";
import { ProviderPanel, SmsCreditsTable, SmsLog, SmsSettingsPanel, TopUpLog } from "@/components/super-admin/sms-gateway";
import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/super-admin/ui";
import { getSettings } from "@/lib/settings/queries";
import { smsProviderStatus } from "@/lib/sms/provider";
import { getSmsOverview } from "@/lib/sms/queries";
import { formatPoisha } from "@/lib/sms/segments";
import { formatNumber } from "@/lib/super-admin/data";
import { getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: "SMS Gateway" };

export default async function SmsPage() {
  const now = await getRequestTime();
  const [overview, settings] = await Promise.all([getSmsOverview(now), getSettings()]);
  const status = smsProviderStatus();
  const { month } = overview;
  const outstanding = overview.institutes.reduce((s, i) => s + i.credit, 0);
  const low = overview.institutes.filter((i) => i.credit < 100).length;
  const anySent = overview.days.some((d) => d.sms > 0);

  return (
    <>
      <PageHeader
        title="SMS Gateway"
        description={status.connected ? `Sending through ${status.label}` : "No SMS provider connected yet"}
      />

      <section aria-label="SMS summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="SMS this month" value={formatNumber(month.segments)} icon={MessageSquareText} note={`${formatNumber(month.messages)} messages`} />
        <StatCard
          label="Cost this month"
          value={settings.smsRatePoisha ? formatPoisha(month.costPoisha) : "—"}
          icon={Wallet}
          note={settings.smsRatePoisha ? `at ${formatPoisha(settings.smsRatePoisha)} per SMS` : "Set the price per SMS below"}
        />
        <StatCard label="Failed" value={formatNumber(month.failed)} icon={AlertTriangle} note={month.messages ? `${Math.round((month.failed / month.messages) * 100)}% of this month's messages` : "Nothing sent this month"} />
        <StatCard label="Credits held" value={formatNumber(outstanding)} icon={Wallet2} note={low ? `${low} ${low === 1 ? "institute is" : "institutes are"} below 100 credits` : "Across all institutes"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ProviderPanel status={status} />
        <div className="grid content-start gap-4">
          <SmsSettingsPanel senderId={settings.smsSenderId} ratePoisha={settings.smsRatePoisha} />
          <Panel>
            <PanelHeader title="SMS per day" description="Last 14 days, across all institutes" />
            {anySent ? (
              <div className="p-4 pt-2">
                <SmsChart data={overview.days} />
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">The chart fills in once SMS start going out.</p>
            )}
          </Panel>
        </div>
      </section>

      <SmsCreditsTable institutes={overview.institutes} />

      <section className="grid gap-4 xl:grid-cols-2">
        <SmsLog messages={overview.recent} now={now} />
        <TopUpLog topUps={overview.topUps} now={now} />
      </section>
    </>
  );
}

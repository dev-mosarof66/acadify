import { Suspense } from "react";
import { AlertTriangle, CalendarCheck, HandCoins, Wallet } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PaymentsList } from "@/components/dashboard/fees";
import { taka } from "@/lib/fees/format";
import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/super-admin/ui";
import { requireInstituteMember } from "@/lib/auth/session";
import { getFeeOverview } from "@/lib/fees/queries";
import { getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: "Fees" };

async function Overview() {
  const [viewer, now] = await Promise.all([requireInstituteMember("fees:read"), getRequestTime()]);
  const o = await getFeeOverview(viewer.active.instituteId, now);
  return (
    <>
      <PageHeader title="Fees" description="Collections, dues and receipts" />
      <section aria-label="Fee summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected today" value={taka(o.collectedToday)} icon={HandCoins} note="At the counter and by mobile banking" />
        <StatCard label="Collected this month" value={taka(o.collectedThisMonth)} icon={CalendarCheck} note={`${o.paymentsThisMonth} payments`} />
        <StatCard label="Outstanding" value={taka(o.outstanding)} icon={Wallet} note={`${o.studentsOwing} students owe money`} />
        <StatCard label="Past due date" value={String(o.studentsOverdue)} icon={AlertTriangle} note="Students with an overdue bill" />
      </section>
      <Panel>
        <PanelHeader title="Latest payments" description="Open one to see or print its receipt" />
        <PaymentsList payments={o.recent} now={now} empty="No payments yet." />
      </Panel>
    </>
  );
}

export default function FeesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Overview />
    </Suspense>
  );
}

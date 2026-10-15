import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DuesTable } from "@/components/dashboard/fees";
import { taka } from "@/lib/fees/format";
import { PageHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getDues } from "@/lib/fees/queries";
import { getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: "Dues" };

async function Dues() {
  const [viewer, now] = await Promise.all([requireInstituteMember("fees:read"), getRequestTime()]);
  const dues = await getDues(viewer.active.instituteId);
  const today = new Date(now + 6 * 3600_000).toISOString().slice(0, 10);
  const total = dues.reduce((n, d) => n + d.owed, 0);
  return (
    <>
      <PageHeader title="Dues" description={dues.length ? `${dues.length} students owe ${taka(total)}` : "Students with unpaid bills"} />
      <DuesTable dues={dues} today={today} canRemind={can(viewer.active.role, "fees:collect")} />
    </>
  );
}

export default function DuesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Dues />
    </Suspense>
  );
}

import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyBills, OneTimeCharge } from "@/components/dashboard/fees";
import { PageHeader } from "@/components/super-admin/ui";
import { requireInstituteMember } from "@/lib/auth/session";
import { getFeeHeads, getMonthBilling, monthOf } from "@/lib/fees/queries";
import { getClasses } from "@/lib/institute/queries";
import { getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: "Monthly bills" };

const MONTH_LABEL = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const label = (m: string) => MONTH_LABEL.format(new Date(`${m}-01T00:00:00Z`));

async function Bills({ searchParams }: { searchParams: PageProps<"/dashboard/fees/bills">["searchParams"] }) {
  const [viewer, params, now] = await Promise.all([requireInstituteMember("fees:manage"), searchParams, getRequestTime()]);
  const instituteId = viewer.active.instituteId;
  // Last month, this month and the next two
  const months = [-1, 0, 1, 2].map((offset) => {
    const d = new Date(now + 6 * 3600_000);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + offset);
    const m = d.toISOString().slice(0, 7);
    return { value: m, label: label(m) };
  });
  const asked = typeof params.month === "string" ? params.month : "";
  const month = months.some((m) => m.value === asked) ? asked : monthOf(now);
  const [rows, heads, classes] = await Promise.all([getMonthBilling(instituteId, month), getFeeHeads(instituteId), getClasses(instituteId)]);

  return (
    <>
      <PageHeader title="Monthly bills" description="Bill every student their monthly fees in one click; nobody is billed twice for a month" />
      <MonthlyBills months={months} month={month} rows={rows} />
      <OneTimeCharge heads={heads} classes={classes} today={new Date(now + 6 * 3600_000).toISOString().slice(0, 10)} />
    </>
  );
}

export default function BillsPage(props: PageProps<"/dashboard/fees/bills">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Bills searchParams={props.searchParams} />
    </Suspense>
  );
}

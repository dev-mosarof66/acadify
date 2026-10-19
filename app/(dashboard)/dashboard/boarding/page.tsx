import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/dashboard/attendance";
import { AddBoarder, MealSheet } from "@/components/dashboard/boarding";
import { PageHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getBoarders, getNonBoarders } from "@/lib/boarding/queries";
import { dhakaDate } from "@/lib/institute/attendance-queries";
import { getRequestTime } from "@/lib/super-admin/queries";
import { dayLabel } from "@/lib/ui/labels";

export const metadata = { title: "Boarding" };

async function Boarding({ searchParams }: { searchParams: PageProps<"/dashboard/boarding">["searchParams"] }) {
  const [viewer, params, now] = await Promise.all([requireInstituteMember("boarding:read"), searchParams, getRequestTime()]);
  const today = dhakaDate(now);
  const earliest = dhakaDate(now - 7 * 86_400_000);
  const asked = typeof params.date === "string" ? params.date : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today && asked >= earliest ? asked : today;
  const canEdit = can(viewer.active.role, "boarding:write");

  const [boarders, others] = await Promise.all([getBoarders(viewer.active.instituteId, date), canEdit ? getNonBoarders(viewer.active.instituteId) : Promise.resolve([])]);

  return (
    <>
      <PageHeader
        title="Boarding"
        description={`${date === today ? "Today" : dayLabel(date)} · ${boarders.length} boarders`}
        actions={<DatePicker date={date} today={today} earliest={earliest} basePath="/dashboard/boarding" />}
      />
      <MealSheet key={date} date={date} boarders={boarders} canEdit={canEdit} />
      {canEdit && <AddBoarder options={others.map((s) => ({ id: s.id, label: `${s.name} · ${s.className} ${s.sectionName} · Roll ${s.roll}` }))} />}
    </>
  );
}

export default function BoardingPage(props: PageProps<"/dashboard/boarding">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Boarding searchParams={props.searchParams} />
    </Suspense>
  );
}

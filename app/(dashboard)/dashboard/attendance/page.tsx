import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker, SectionDayList } from "@/components/dashboard/attendance";
import { PageHeader } from "@/components/super-admin/ui";
import { requireInstituteMember } from "@/lib/auth/session";
import { dhakaDate, getSectionsForDay, marksAllSections } from "@/lib/institute/attendance-queries";
import { getRequestTime } from "@/lib/super-admin/queries";
import { dayLabel } from "@/lib/ui/labels";

export const metadata = { title: "Attendance" };

async function Attendance({ searchParams }: { searchParams: PageProps<"/dashboard/attendance">["searchParams"] }) {
  const [viewer, params, now] = await Promise.all([requireInstituteMember("attendance:read"), searchParams, getRequestTime()]);
  const today = dhakaDate(now);
  const earliest = dhakaDate(now - 7 * 86_400_000);
  const asked = typeof params.date === "string" ? params.date : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today && asked >= earliest ? asked : today;

  const sections = await getSectionsForDay({ instituteId: viewer.active.instituteId, memberId: viewer.active.memberId, role: viewer.active.role, date });
  const done = sections.filter((s) => s.taken).length;
  const all = marksAllSections(viewer.active.role);

  return (
    <>
      <PageHeader
        title="Attendance"
        description={`${date === today ? "Today" : dayLabel(date)} · ${done} of ${sections.length} ${all ? "sections" : "of your sections"} done`}
        actions={<DatePicker date={date} today={today} earliest={earliest} basePath="/dashboard/attendance" />}
      />
      <SectionDayList
        sections={sections}
        date={date}
        emptyText={all ? "Add classes and sections first, under Classes." : "You aren't assigned to any section yet. Ask your principal to assign you under Teachers."}
      />
    </>
  );
}

export default function AttendancePage(props: PageProps<"/dashboard/attendance">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Attendance searchParams={props.searchParams} />
    </Suspense>
  );
}

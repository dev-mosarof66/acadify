import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceSheet, DatePicker } from "@/components/dashboard/attendance";

import { PageHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { canMarkSection, dhakaDate, getAttendanceSheet } from "@/lib/institute/attendance-queries";
import { getRequestTime } from "@/lib/super-admin/queries";
import { dayLabel, SHIFT_LABELS } from "@/lib/ui/labels";

export const metadata = { title: "Take attendance" };

async function Sheet({ params, searchParams }: PageProps<"/dashboard/attendance/[sectionId]">) {
  const [viewer, { sectionId }, query, now] = await Promise.all([requireInstituteMember("attendance:write"), params, searchParams, getRequestTime()]);
  const today = dhakaDate(now);
  const earliest = dhakaDate(now - 7 * 86_400_000);
  const asked = typeof query.date === "string" ? query.date : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today && asked >= earliest ? asked : today;

  const allowed = await canMarkSection({ instituteId: viewer.active.instituteId, memberId: viewer.active.memberId, role: viewer.active.role, sectionId });
  if (!allowed) redirect("/dashboard/attendance");
  const sheet = await getAttendanceSheet(viewer.active.instituteId, sectionId, date);
  if (!sheet) notFound();

  return (
    <>
      <Link href={`/dashboard/attendance?date=${date}`} className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        All sections
      </Link>
      <PageHeader
        title={`${sheet.section.className} · Section ${sheet.section.name}`}
        description={`${SHIFT_LABELS[sheet.section.shift]} shift · ${date === today ? "Today" : dayLabel(date)} · ${sheet.rows.length} students`}
        actions={<DatePicker date={date} today={today} earliest={earliest} basePath={`/dashboard/attendance/${sectionId}`} />}
      />
      <AttendanceSheet
        key={`${sectionId}-${date}`}
        section={sheet.section}
        date={date}
        rows={sheet.rows}
        taken={sheet.taken}
        markedAt={sheet.markedAt}
        canSms={can(viewer.active.role, "attendance:write")}
      />
    </>
  );
}

/** Params are read inside Suspense so navigation stays instant (Cache Components). */
export default function SheetPage(props: PageProps<"/dashboard/attendance/[sectionId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Sheet {...props} />
    </Suspense>
  );
}

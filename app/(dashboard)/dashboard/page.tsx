import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { PortalHome } from "@/components/dashboard/portal";
import { requireInstituteMember } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/institute/queries";
import { dhakaDate, getSectionsForDay, getStudentAttendance, marksAllSections } from "@/lib/institute/attendance-queries";
import { getStudentFees } from "@/lib/fees/queries";
import { getLinkedStudents, isPortalRole } from "@/lib/portal/queries";
import { can } from "@/lib/auth/rbac";
import { getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: "Dashboard" };

async function Home({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const [viewer, params] = await Promise.all([requireInstituteMember(), searchParams]);
  if (isPortalRole(viewer.active.role)) return <Portal viewer={viewer} forbidden={params.error === "forbidden"} />;
  const [stats, now] = await Promise.all([getDashboardStats(viewer.active.instituteId), getRequestTime()]);
  const today = can(viewer.active.role, "attendance:read")
    ? await getSectionsForDay({ instituteId: viewer.active.instituteId, memberId: viewer.active.memberId, role: viewer.active.role, date: dhakaDate(now) })
    : null;
  return (
    <DashboardHome
      name={viewer.name}
      instituteName={viewer.active.instituteName}
      role={viewer.active.role}
      stats={stats}
      today={today}
      marksAll={marksAllSections(viewer.active.role)}
      forbidden={params.error === "forbidden"}
    />
  );
}

/** Students and guardians: their linked students with this month's attendance and fees due. */
async function Portal({ viewer, forbidden }: { viewer: Awaited<ReturnType<typeof requireInstituteMember>>; forbidden: boolean }) {
  const instituteId = viewer.active.instituteId;
  const [linked, now] = await Promise.all([getLinkedStudents(viewer.active.memberId), getRequestTime()]);
  const today = dhakaDate(now);
  const students = await Promise.all(
    linked.map(async (student) => {
      const [month, fees] = await Promise.all([getStudentAttendance(instituteId, student.id, `${today.slice(0, 7)}-01`, today), getStudentFees(instituteId, student.id)]);
      return {
        student,
        attendanceRate: month.days ? Math.round(((month.present + month.late) / month.days) * 100) : null,
        absent: month.absent,
        outstanding: fees.outstanding,
      };
    })
  );
  return <PortalHome name={viewer.name} instituteName={viewer.active.instituteName} role={viewer.active.role} students={students} forbidden={forbidden} />;
}

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[24px]" />}>
      <Home searchParams={props.searchParams} />
    </Suspense>
  );
}

import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { TeacherAssignments } from "@/components/dashboard/teachers";
import { PageHeader } from "@/components/super-admin/ui";
import { roleLabel, type InstituteRole } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getSectionAssignments } from "@/lib/institute/attendance-queries";
import { getStaff } from "@/lib/institute/queries";

export const metadata = { title: "Teachers" };

/** People who can teach a section. */
const TEACHING_ROLES: InstituteRole[] = ["teacher", "institute_admin", "principal"];

async function Teachers() {
  const viewer = await requireInstituteMember("institute:settings");
  const [sections, staff] = await Promise.all([getSectionAssignments(viewer.active.instituteId), getStaff(viewer.active.instituteId)]);
  const teachers = staff
    .filter((s) => TEACHING_ROLES.includes(s.role))
    .sort((a, b) => TEACHING_ROLES.indexOf(a.role) - TEACHING_ROLES.indexOf(b.role) || a.name.localeCompare(b.name))
    .map((s) => ({ memberId: s.memberId, name: s.name, roleLabel: roleLabel(s.role, viewer.active.instituteType) }));
  const unassigned = sections.filter((s) => !s.teachers.length).length;

  return (
    <>
      <PageHeader
        title="Teachers"
        description={
          sections.length
            ? `Who teaches each section. Teachers take attendance for their own sections. ${unassigned ? `${unassigned} ${unassigned === 1 ? "section has" : "sections have"} no teacher yet.` : "Every section has a teacher."}`
            : "Assign teachers to sections"
        }
      />
      <TeacherAssignments sections={sections} staff={teachers} />
    </>
  );
}

export default function TeachersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Teachers />
    </Suspense>
  );
}

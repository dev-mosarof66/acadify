import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AddStaffButton, StaffTable } from "@/components/dashboard/staff";
import { PageHeader } from "@/components/super-admin/ui";
import { STAFF_ROLES_GRANTABLE } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getStaff } from "@/lib/institute/queries";
import { getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: "Staff" };

async function Staff() {
  const viewer = await requireInstituteMember("members:manage");
  const [staff, now] = await Promise.all([getStaff(viewer.active.instituteId), getRequestTime()]);
  const grantable = STAFF_ROLES_GRANTABLE[viewer.active.role] ?? [];

  return (
    <>
      <PageHeader
        title="Staff"
        description={`${staff.length} ${staff.length === 1 ? "person has" : "people have"} access to ${viewer.active.instituteName}`}
        actions={<AddStaffButton roles={grantable} />}
      />
      <StaffTable staff={staff} me={viewer.id} removable={grantable} now={now} />
    </>
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Staff />
    </Suspense>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { Download, IdCard } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { AddStudentButton, StudentsTable } from "@/components/dashboard/students";
import { ImportStudentsButton } from "@/components/dashboard/import-buttons";
import { PageHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getClasses, getStudents } from "@/lib/institute/queries";

export const metadata = { title: "Students" };

async function Students() {
  const viewer = await requireInstituteMember("students:read");
  const [students, classes] = await Promise.all([getStudents(viewer.active.instituteId), getClasses(viewer.active.instituteId)]);
  const active = students.filter((s) => s.status === "active").length;

  return (
    <>
      <PageHeader
        title="Students"
        description={students.length ? `${active.toLocaleString("en-IN")} active students in ${classes.length} classes` : "Everyone enrolled at your institute"}
        actions={
          <div className="flex flex-wrap gap-2">
            <a href="/api/export/students" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold">
              <Download className="size-4" />
              Export
            </a>
            <Link href="/dashboard/students/id-cards" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold">
              <IdCard className="size-4" />
              ID cards
            </Link>
            {can(viewer.active.role, "students:write") && (
              <>
                <ImportStudentsButton />
                <AddStudentButton classes={classes} />
              </>
            )}
          </div>
        }
      />
      <StudentsTable students={students} classes={classes} />
    </>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Students />
    </Suspense>
  );
}

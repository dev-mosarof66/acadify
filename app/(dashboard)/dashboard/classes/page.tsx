import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ClassesBoard, NewClassButton } from "@/components/dashboard/classes-board";
import { PageHeader } from "@/components/super-admin/ui";
import { requireInstituteMember } from "@/lib/auth/session";
import { getClasses } from "@/lib/institute/queries";

export const metadata = { title: "Classes" };

async function Classes() {
  const viewer = await requireInstituteMember("institute:settings");
  const classes = await getClasses(viewer.active.instituteId);
  const students = classes.reduce((n, c) => n + c.students, 0);
  return (
    <>
      <PageHeader
        title="Classes"
        description={classes.length ? `${classes.length} classes · ${students.toLocaleString("en-IN")} students` : "Set up the classes and sections your institute teaches"}
        actions={<NewClassButton />}
      />
      <ClassesBoard classes={classes} />
    </>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Classes />
    </Suspense>
  );
}

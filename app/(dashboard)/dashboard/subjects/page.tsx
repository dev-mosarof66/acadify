import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SubjectsBoard } from "@/components/dashboard/exams";
import { ImportSubjectsButton } from "@/components/dashboard/import-buttons";
import { PageHeader } from "@/components/super-admin/ui";
import { requireInstituteMember } from "@/lib/auth/session";
import { getSubjects } from "@/lib/exams/queries";
import { getClasses } from "@/lib/institute/queries";

export const metadata = { title: "Subjects" };

async function Subjects() {
  const viewer = await requireInstituteMember("institute:settings");
  const [classes, subjects] = await Promise.all([getClasses(viewer.active.instituteId), getSubjects(viewer.active.instituteId)]);
  return (
    <>
      <PageHeader title="Subjects" description="Each class's subjects with full and pass marks, used by exams and lecture sheets"
        actions={<ImportSubjectsButton />} />
      <SubjectsBoard classes={classes} subjects={subjects} />
    </>
  );
}

export default function SubjectsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Subjects />
    </Suspense>
  );
}

import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SheetsLibrary, UploadSheetButton } from "@/components/dashboard/sheets";
import { PageHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getSubjects } from "@/lib/exams/queries";
import { marksAllSections } from "@/lib/institute/attendance-queries";
import { getClasses } from "@/lib/institute/queries";
import { getSheets } from "@/lib/sheets/queries";

export const metadata = { title: "Lecture sheets" };

async function Sheets() {
  const viewer = await requireInstituteMember("sheets:read");
  const instituteId = viewer.active.instituteId;
  const [sheets, classes, subjects] = await Promise.all([getSheets(instituteId), getClasses(instituteId), getSubjects(instituteId)]);
  const canWrite = can(viewer.active.role, "sheets:write");
  const admin = marksAllSections(viewer.active.role);
  const removable = canWrite ? sheets.filter((s) => admin || s.uploadedBy === viewer.id).map((s) => s.id) : [];

  return (
    <>
      <PageHeader
        title="Lecture sheets"
        description={`${sheets.length} sheets for your classes`}
        actions={canWrite ? <UploadSheetButton classes={classes} subjects={subjects} /> : undefined}
      />
      <SheetsLibrary sheets={sheets} classes={classes.map((c) => ({ id: c.id, name: c.name }))} removable={removable} />
    </>
  );
}

export default function SheetsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Sheets />
    </Suspense>
  );
}

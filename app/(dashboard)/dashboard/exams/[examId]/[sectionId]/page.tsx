import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { MarksSheet } from "@/components/dashboard/exams";
import { PageHeader } from "@/components/super-admin/ui";
import { requireInstituteMember } from "@/lib/auth/session";
import { getExam, getMarksSheet } from "@/lib/exams/queries";
import { canMarkSection } from "@/lib/institute/attendance-queries";

export const metadata = { title: "Enter marks" };

async function Sheet({ params }: { params: Promise<{ examId: string; sectionId: string }> }) {
  const [viewer, { examId, sectionId }] = await Promise.all([requireInstituteMember("exams:write"), params]);
  const instituteId = viewer.active.instituteId;
  const allowed = await canMarkSection({ instituteId, memberId: viewer.active.memberId, role: viewer.active.role, sectionId });
  if (!allowed) redirect(`/dashboard/exams/${examId}`);
  const [exam, sheet] = await Promise.all([getExam(instituteId, examId), getMarksSheet(instituteId, examId, sectionId)]);
  if (!exam || !sheet) notFound();

  return (
    <>
      <Link href={`/dashboard/exams/${examId}`} className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        {exam.name}
      </Link>
      <PageHeader
        title={`${sheet.section.className} · Section ${sheet.section.name}`}
        description={`${exam.name} · ${sheet.students.length} students · empty = not entered yet, Abs = absent`}
      />
      <MarksSheet
        key={`${examId}-${sectionId}`}
        examId={examId}
        sectionId={sectionId}
        subjects={sheet.subjects}
        students={sheet.students}
        marks={sheet.marks}
        locked={exam.published}
      />
    </>
  );
}

export default function MarksPage({ params }: PageProps<"/dashboard/exams/[examId]/[sectionId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Sheet params={params} />
    </Suspense>
  );
}

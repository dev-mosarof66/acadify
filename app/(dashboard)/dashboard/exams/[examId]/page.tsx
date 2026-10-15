import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { ExamAdminActions, ExamSections } from "@/components/dashboard/exams";
import { PageHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { SCALE_LABELS } from "@/lib/exams/grading";
import { getExam, getExamProgress } from "@/lib/exams/queries";
import { getSectionsForDay, marksAllSections } from "@/lib/institute/attendance-queries";

export const metadata = { title: "Exam" };

async function Exam({ params }: { params: Promise<{ examId: string }> }) {
  const [viewer, { examId }] = await Promise.all([requireInstituteMember("exams:read"), params]);
  const instituteId = viewer.active.instituteId;
  const exam = await getExam(instituteId, examId);
  if (!exam) notFound();

  const all = marksAllSections(viewer.active.role);
  const [progress, mine] = await Promise.all([
    getExamProgress(instituteId, examId),
    // Sections this person can enter marks for (all for admins, assigned ones for teachers)
    getSectionsForDay({ instituteId, memberId: viewer.active.memberId, role: viewer.active.role, date: "1970-01-01" }),
  ]);
  const mineIds = mine.map((s) => s.sectionId);
  const canWrite = can(viewer.active.role, "exams:write");
  const visible = all ? progress : progress.filter((p) => mineIds.includes(p.sectionId));

  return (
    <>
      <Link href="/dashboard/exams" className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        All exams
      </Link>
      <PageHeader
        title={exam.name}
        description={`${SCALE_LABELS[exam.gradingScale]} · ${exam.published ? "Results published to students and guardians" : "Draft: results aren't visible to students yet"}`}
        actions={can(viewer.active.role, "institute:settings") ? <ExamAdminActions exam={exam} /> : undefined}
      />
      <ExamSections examId={exam.id} sections={visible} enterable={canWrite && !exam.published ? mineIds : []} />
    </>
  );
}

export default function ExamPage({ params }: PageProps<"/dashboard/exams/[examId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Exam params={params} />
    </Suspense>
  );
}

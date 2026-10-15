import { Suspense } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExamsList, NewExamButton } from "@/components/dashboard/exams";
import { PageHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getExams } from "@/lib/exams/queries";

export const metadata = { title: "Exams & results" };

async function Exams() {
  const viewer = await requireInstituteMember("exams:read");
  const exams = await getExams(viewer.active.instituteId);
  const admin = can(viewer.active.role, "institute:settings");
  return (
    <>
      <PageHeader
        title="Exams & results"
        description="Marks entry, results and report cards"
        actions={
          admin ? (
            <>
              <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/subjects" />} className="h-10 gap-1.5 rounded-full px-4 font-bold">
                <BookOpen className="size-4" />
                Subjects
              </Button>
              <NewExamButton />
            </>
          ) : undefined
        }
      />
      <ExamsList exams={exams} />
    </>
  );
}

export default function ExamsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Exams />
    </Suspense>
  );
}

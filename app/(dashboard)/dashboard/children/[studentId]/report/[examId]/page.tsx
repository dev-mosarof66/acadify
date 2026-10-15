import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PrintPageButton } from "@/components/dashboard/exams";
import { ReportCard } from "@/components/dashboard/report-card";
import { getReportCard } from "@/lib/exams/queries";
import { requirePortalStudent } from "@/lib/portal/guard";

export const metadata = { title: "Report card" };

/** Only published exams are visible in the portal. */
async function Report({ params }: { params: Promise<{ studentId: string; examId: string }> }) {
  const { studentId, examId } = await params;
  const viewer = await requirePortalStudent(studentId);
  const card = await getReportCard(viewer.active.instituteId, examId, studentId);
  if (!card || !card.exam.published) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/children/${studentId}`} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          {card.row.name}
        </Link>
        <PrintPageButton label="Print report card" />
      </div>
      <ReportCard card={card} />
    </>
  );
}

export default function PortalReportPage({ params }: PageProps<"/dashboard/children/[studentId]/report/[examId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Report params={params} />
    </Suspense>
  );
}

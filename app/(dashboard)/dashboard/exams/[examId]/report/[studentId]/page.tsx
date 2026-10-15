import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PrintPageButton } from "@/components/dashboard/exams";
import { ReportCard } from "@/components/dashboard/report-card";
import { requireInstituteMember } from "@/lib/auth/session";
import { getReportCard } from "@/lib/exams/queries";

export const metadata = { title: "Report card" };

async function Report({ params }: { params: Promise<{ examId: string; studentId: string }> }) {
  const [viewer, { examId, studentId }] = await Promise.all([requireInstituteMember("exams:read"), params]);
  const card = await getReportCard(viewer.active.instituteId, examId, studentId);
  if (!card) notFound();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/exams/${examId}/${card.section.id}/results`} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          {card.section.className} · {card.section.name} results
        </Link>
        <PrintPageButton label="Print report card" />
      </div>
      <ReportCard card={card} />
    </>
  );
}

export default function ReportPage({ params }: PageProps<"/dashboard/exams/[examId]/report/[studentId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Report params={params} />
    </Suspense>
  );
}

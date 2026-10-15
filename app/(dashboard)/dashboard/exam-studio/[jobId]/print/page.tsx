import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PrintPageButton } from "@/components/dashboard/exams";
import { QuestionPaper } from "@/components/dashboard/question-paper";
import { seedFromId, SET_NAMES } from "@/lib/ai/paper";
import { getPaperJob } from "@/lib/ai/queries";
import { requireInstituteMember } from "@/lib/auth/session";

export const metadata = { title: "Print question paper" };

async function PrintPaper({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [viewer, { jobId }, query] = await Promise.all([requireInstituteMember("exams:write"), params, searchParams]);
  const job = await getPaperJob(viewer.active.instituteId, jobId);
  // Only approved papers can be printed
  if (!job || job.status !== "approved" || !job.paper) notFound();
  const set = Math.min(Math.max(Number(query.set) || 0, 0), job.params.sets - 1);
  const answerKey = query.key === "1";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/exam-studio/${job.id}`} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          {job.title}
        </Link>
        <PrintPageButton label={`Print ${answerKey ? "answer key" : "paper"}${job.params.sets > 1 ? ` (set ${SET_NAMES[set].en})` : ""}`} />
      </div>
      <QuestionPaper paper={job.paper} params={job.params} instituteName={viewer.active.instituteName} set={set} seed={seedFromId(job.id)} answerKey={answerKey} />
    </>
  );
}

export default function PrintPaperPage({ params, searchParams }: PageProps<"/dashboard/exam-studio/[jobId]/print">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <PrintPaper params={params} searchParams={searchParams} />
    </Suspense>
  );
}

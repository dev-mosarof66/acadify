import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PaperReview, PaperStatusBadge, RetryButton, WritingProgress } from "@/components/dashboard/exam-studio";
import { PageHeader } from "@/components/super-admin/ui";
import { totalMarks } from "@/lib/ai/paper";
import { getPaperJob } from "@/lib/ai/queries";
import { requireInstituteMember } from "@/lib/auth/session";
import { marksAllSections } from "@/lib/institute/attendance-queries";
import { formatDate } from "@/lib/super-admin/data";

export const metadata = { title: "Question paper" };

// "Try again" writes the paper after its action returns, within this time limit
export const maxDuration = 300;

async function PaperJobView({ params }: { params: Promise<{ jobId: string }> }) {
  const [viewer, { jobId }] = await Promise.all([requireInstituteMember("exams:write"), params]);
  const job = await getPaperJob(viewer.active.instituteId, jobId);
  if (!job) notFound();
  const canDecide = job.requestedBy === viewer.id || marksAllSections(viewer.active.role);
  const p = job.params;

  return (
    <>
      <Link href="/dashboard/exam-studio" className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        All question papers
      </Link>
      <PageHeader
        title={job.title}
        description={`${p.cqCount} creative (answer ${p.cqToAnswer}) + ${p.mcqCount} MCQs · ${totalMarks(p)} marks · ${p.minutes} minutes · asked by ${job.requestedByName} on ${formatDate(job.createdAt)}`}
        actions={<PaperStatusBadge status={job.status} />}
      />

      {(job.status === "queued" || job.status === "running") && <WritingProgress />}
      {job.status === "failed" && (
        <div className="grid gap-3 rounded-2xl bg-danger-light px-5 py-4">
          <p className="text-sm font-semibold text-destructive">{job.error ?? "The paper couldn't be written."}</p>
          <RetryButton jobId={job.id} />
        </div>
      )}
      {job.approval && (
        <p className="rounded-2xl bg-secondary px-5 py-4 text-sm">
          <span className="font-bold">{job.approval.decision === "rejected" ? "Rejected" : job.approval.decision === "edited" ? "Edited and approved" : "Approved"}</span> by {job.approval.decidedByName} on {formatDate(job.approval.decidedAt)}
          {job.approval.note && ` · ${job.approval.note}`}
        </p>
      )}
      {job.status === "awaiting_approval" && !canDecide && <p className="rounded-2xl bg-secondary px-5 py-4 text-sm">Waiting for {job.requestedByName} or the principal to review this draft.</p>}
      {job.paper && job.status !== "rejected" && <PaperReview job={job} instituteName={viewer.active.instituteName} canDecide={canDecide} />}
    </>
  );
}

export default function PaperJobPage({ params }: PageProps<"/dashboard/exam-studio/[jobId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <PaperJobView params={params} />
    </Suspense>
  );
}

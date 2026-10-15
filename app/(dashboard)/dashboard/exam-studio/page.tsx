import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { NewPaperButton, PaperJobsList } from "@/components/dashboard/exam-studio";
import { PageHeader } from "@/components/super-admin/ui";
import { aiConfigured, getAiCredit } from "@/lib/ai/claude";
import { getPaperJobs } from "@/lib/ai/queries";
import { requireInstituteMember } from "@/lib/auth/session";
import { getSubjects } from "@/lib/exams/queries";
import { getClasses } from "@/lib/institute/queries";
import { getSheets } from "@/lib/sheets/queries";

export const metadata = { title: "AI Exam Studio" };

// The paper is written after the "Write the paper" action returns, within this time limit
export const maxDuration = 300;

async function ExamStudio() {
  const viewer = await requireInstituteMember("exams:write");
  const instituteId = viewer.active.instituteId;
  const [jobs, classes, subjects, sheets, credit] = await Promise.all([getPaperJobs(instituteId), getClasses(instituteId), getSubjects(instituteId), getSheets(instituteId), getAiCredit(instituteId)]);
  const ready = aiConfigured();
  const usedUp = credit.left !== null && credit.left <= 0;

  return (
    <>
      <PageHeader
        title="AI Exam Studio"
        description={`AI drafts board-pattern papers from your chapters and lecture sheets; a teacher approves every one${credit.cap !== null ? ` · AI credit this month: ৳${Math.round(credit.used)} of ৳${credit.cap}` : ""}`}
        actions={<NewPaperButton classes={classes} subjects={subjects} sheets={sheets} disabled={!ready || usedUp || subjects.length === 0} />}
      />
      {!ready && <p className="rounded-2xl bg-warning-light px-5 py-4 text-sm font-semibold text-warning">AI isn&apos;t set up for Acadify yet. The Acadify team needs to add the AI key before papers can be written.</p>}
      {ready && subjects.length === 0 && <p className="rounded-2xl bg-secondary px-5 py-4 text-sm font-semibold">Add your classes&apos; subjects first, then come back to write papers.</p>}
      {usedUp && <p className="rounded-2xl bg-warning-light px-5 py-4 text-sm font-semibold text-warning">This month&apos;s AI credit is used up. It resets on the 1st.</p>}
      <PaperJobsList jobs={jobs} />
    </>
  );
}

export default function ExamStudioPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <ExamStudio />
    </Suspense>
  );
}

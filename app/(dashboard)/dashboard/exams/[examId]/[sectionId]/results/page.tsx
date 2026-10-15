import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PrintPageButton } from "@/components/dashboard/exams";
import { PageHeader, Panel } from "@/components/super-admin/ui";
import { requireInstituteMember } from "@/lib/auth/session";
import { getExam, getSectionResults } from "@/lib/exams/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Results" };

async function Results({ params }: { params: Promise<{ examId: string; sectionId: string }> }) {
  const [viewer, { examId, sectionId }] = await Promise.all([requireInstituteMember("exams:read"), params]);
  const instituteId = viewer.active.instituteId;
  const exam = await getExam(instituteId, examId);
  if (!exam) notFound();
  const results = await getSectionResults(instituteId, examId, sectionId, exam.gradingScale);
  if (!results) notFound();
  const passed = results.rows.filter((r) => r.result.passed).length;
  const complete = results.rows.filter((r) => r.result.complete).length;

  return (
    <>
      <Link href={`/dashboard/exams/${examId}`} className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary print:hidden">
        <ArrowLeft className="size-4" />
        {exam.name}
      </Link>
      <PageHeader
        title={`${results.section.className} · Section ${results.section.name}: results`}
        description={`${exam.name} · ${passed} of ${complete} passed${complete < results.rows.length ? ` · ${results.rows.length - complete} students still have missing marks` : ""}`}
        actions={<PrintPageButton label="Print tabulation" />}
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 py-3 text-left font-bold">Roll</th>
                <th className="px-3 py-3 text-left font-bold">Student</th>
                {results.subjects.map((s) => (
                  <th key={s.id} className="px-2 py-3 text-center font-bold">
                    {s.name}
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-bold">Total</th>
                <th className="px-3 py-3 text-center font-bold">{exam.gradingScale === "gpa5" ? "GPA" : "Result"}</th>
                <th className="px-3 py-3 text-center font-bold">Position</th>
                <th className="px-3 py-3 print:hidden">
                  <span className="sr-only">Report card</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {results.rows.map((r) => (
                <tr key={r.studentId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-extrabold tabular-nums">{r.roll}</td>
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  {r.subjects.map((s) => (
                    <td key={s.subjectId} className={cn("px-2 py-2 text-center tabular-nums", !s.passed && (s.marks !== null || s.absent) && "font-bold text-destructive")}>
                      {s.absent ? "Abs" : s.marks ?? "—"}
                      {s.marks !== null && <span className="block text-[11px] text-muted-foreground">{s.grade}</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold tabular-nums">
                    {r.result.total}/{r.result.fullTotal}
                  </td>
                  <td className={cn("px-3 py-2 text-center font-extrabold", r.result.complete && !r.result.passed && "text-destructive")}>
                    {!r.result.complete ? <span className="font-medium text-muted-foreground">Pending</span> : exam.gradingScale === "gpa5" ? `${r.result.gpa?.toFixed(2)} (${r.result.grade})` : r.result.grade}
                  </td>
                  <td className="px-3 py-2 text-center font-bold tabular-nums">{r.position ?? "—"}</td>
                  <td className="px-3 py-2 text-right print:hidden">
                    <Link href={`/dashboard/exams/${examId}/report/${r.studentId}`} className="text-[13px] font-bold text-primary hover:underline">
                      Report card
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

export default function ResultsPage({ params }: PageProps<"/dashboard/exams/[examId]/[sectionId]/results">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Results params={params} />
    </Suspense>
  );
}

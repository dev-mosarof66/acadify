import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, ChevronRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { BillsTable, PaymentsList } from "@/components/dashboard/fees";
import { HifzHistory, ParaMap } from "@/components/dashboard/hifz";
import { SheetsLibrary } from "@/components/dashboard/sheets";
import { StudentAvatar } from "@/components/dashboard/students";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { taka } from "@/lib/fees/format";
import { getStudentFees } from "@/lib/fees/queries";
import { getHifzStudent } from "@/lib/hifz/queries";
import { dhakaDate, getStudentAttendance } from "@/lib/institute/attendance-queries";
import { getStudent } from "@/lib/institute/queries";
import { requirePortalStudent } from "@/lib/portal/guard";
import { getPublishedExams } from "@/lib/portal/queries";
import { getSheets } from "@/lib/sheets/queries";
import { formatDate } from "@/lib/super-admin/data";
import { getRequestTime } from "@/lib/super-admin/queries";
import { SHIFT_LABELS } from "@/lib/ui/labels";

export const metadata = { title: "Student" };

async function Child({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const viewer = await requirePortalStudent(studentId);
  const instituteId = viewer.active.instituteId;
  const [student, now] = await Promise.all([getStudent(instituteId, studentId), getRequestTime()]);
  if (!student) notFound();
  const today = dhakaDate(now);
  const [month, fees, exams, hifz, sheets] = await Promise.all([
    getStudentAttendance(instituteId, studentId, `${today.slice(0, 7)}-01`, today),
    getStudentFees(instituteId, studentId),
    getPublishedExams(instituteId),
    getHifzStudent(instituteId, studentId),
    getSheets(instituteId, student.classId),
  ]);
  const inClass = month.present + month.late;
  const rate = month.days ? Math.round((inClass / month.days) * 100) : null;
  const hasHifz = hifz && (hifz.logs.length > 0 || Object.keys(hifz.paras).length > 0);

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center gap-4 p-5">
          <StudentAvatar student={student} className="size-16" />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <h1 className="text-xl font-extrabold tracking-tight">{student.name}</h1>
            {student.nameBn && <p className="text-muted-foreground">{student.nameBn}</p>}
            <p className="text-sm font-semibold text-muted-foreground">
              {student.className} · Section {student.sectionName} ({SHIFT_LABELS[student.shift]} shift) · Roll {student.roll} · ID {student.studentCode}
            </p>
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Attendance this month" description={month.days ? `${month.days} school days recorded` : "No attendance taken yet this month"} />
          {month.days > 0 && (
            <div className="grid gap-4 p-5">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <p className="text-[32px] leading-none font-extrabold tracking-tight tabular-nums">{rate}%</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-primary">{inClass} in class</span>
                  {month.late > 0 && ` (${month.late} late)`} · <span className="font-bold text-destructive">{month.absent} absent</span>
                  {month.leave > 0 && ` · ${month.leave} on leave`}
                </p>
              </div>
              {month.missed.length > 0 && <p className="text-[13px] text-muted-foreground">Absent on {month.missed.map((d) => formatDate(d)).join(", ")}</p>}
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Results" description={exams.length ? "Published exams" : "No results published yet"} />
          {exams.length > 0 && (
            <ul className="divide-y divide-border">
              {exams.map((e) => (
                <li key={e.id}>
                  <Link href={`/dashboard/children/${studentId}/report/${e.id}`} className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-secondary/60">
                    <Award className="size-4 shrink-0 text-primary" />
                    <span className="flex-1 font-bold">{e.name}</span>
                    <span className="font-semibold text-primary">Report card</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <Panel>
        <PanelHeader
          title="Fees"
          description={fees.outstanding > 0 ? `${taka(fees.outstanding)} due. Pay at the institute office.` : fees.bills.length ? "All bills are paid." : "No bills yet."}
        />
        <BillsTable bills={fees.bills} canWaive={false} />
      </Panel>
      <Panel>
        <PanelHeader title="Payments" description="Open one to see or print its receipt" />
        <PaymentsList payments={fees.payments} now={now} empty="No payments yet." receiptsPath={`/dashboard/children/${studentId}/receipts`} />
      </Panel>

      {hasHifz && (
        <>
          <ParaMap studentId={studentId} paras={hifz.paras} canWrite={false} />
          <Panel>
            <PanelHeader title="Hifz lessons" description="The last 30 recorded days" />
            <HifzHistory logs={hifz.logs} />
          </Panel>
        </>
      )}

      <section className="grid gap-3">
        <h2 className="text-[15px] font-extrabold tracking-tight">Lecture sheets for {student.className}</h2>
        <SheetsLibrary sheets={sheets} classes={[]} removable={[]} />
      </section>
    </>
  );
}

/** A linked student's portal page. Params are read inside Suspense so navigation stays instant (Cache Components). */
export default function ChildPage({ params }: PageProps<"/dashboard/children/[studentId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Child params={params} />
    </Suspense>
  );
}

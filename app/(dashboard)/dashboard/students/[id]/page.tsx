import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CalendarDays, Hash, Home, Phone, School, UserRound } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PhotoUpload, StudentProfileActions, StudentStatusBadge } from "@/components/dashboard/students";
import { PortalAccessPanel } from "@/components/dashboard/portal-access";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getClasses, getStudent } from "@/lib/institute/queries";
import { dhakaDate, getStudentAttendance } from "@/lib/institute/attendance-queries";
import { getRequestTime } from "@/lib/super-admin/queries";
import { getStudentAccess } from "@/lib/portal/queries";
import { formatDate } from "@/lib/super-admin/data";
import { GROUP_LABELS, SHIFT_LABELS } from "@/lib/ui/labels";

export const metadata = { title: "Student" };

function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <dt className="w-32 shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireInstituteMember("students:read");
  const { id } = await params;
  const [student, classes, now] = await Promise.all([getStudent(viewer.active.instituteId, id), getClasses(viewer.active.instituteId), getRequestTime()]);
  if (!student) notFound();
  const today = dhakaDate(now);
  const [month, access] = await Promise.all([
    getStudentAttendance(viewer.active.instituteId, student.id, `${today.slice(0, 7)}-01`, today),
    getStudentAccess(viewer.active.instituteId, student.id),
  ]);
  const inClass = month.present + month.late;
  const rate = month.days ? Math.round((inClass / month.days) * 100) : null;
  const canEdit = can(viewer.active.role, "students:write");

  return (
    <>
      <Link href="/dashboard/students" className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        All students
      </Link>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel>
          <div className="grid justify-items-center gap-3 p-6 text-center">
            <PhotoUpload student={student} canEdit={canEdit} />
            <div className="grid gap-1">
              <h1 className="text-xl font-extrabold tracking-tight">{student.name}</h1>
              {student.nameBn && <p className="text-muted-foreground">{student.nameBn}</p>}
              <p className="text-sm font-semibold text-muted-foreground">
                {student.className} · Section {student.sectionName} · Roll {student.roll}
              </p>
            </div>
            <StudentStatusBadge status={student.status} />
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          {canEdit && <StudentProfileActions student={student} classes={classes} />}
          <Panel>
            <PanelHeader title="Student" />
            <dl className="divide-y divide-border">
              <Row icon={Hash} label="Student ID">
                <span className="tabular-nums">{student.studentCode}</span>
              </Row>
              <Row icon={School} label="Class">
                {student.className}, section {student.sectionName} ({SHIFT_LABELS[student.shift]} shift), roll {student.roll}
              </Row>
              {student.group && (
                <Row icon={BookOpen} label="Study group">
                  {GROUP_LABELS[student.group]}
                </Row>
              )}
              <Row icon={UserRound} label="Boy or girl">
                {student.gender === "female" ? "Girl" : "Boy"}
              </Row>
              <Row icon={CalendarDays} label="Date of birth">
                {student.dateOfBirth ? formatDate(student.dateOfBirth) : "Not given"}
              </Row>
              <Row icon={CalendarDays} label="Admitted">
                {formatDate(student.admittedOn)}
              </Row>
            </dl>
          </Panel>
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
                {month.missed.length > 0 && (
                  <p className="text-[13px] text-muted-foreground">
                    Absent on {month.missed.map((d) => formatDate(d)).join(", ")}
                  </p>
                )}
              </div>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Guardian" description="Attendance and fee SMS go to this mobile" />
            <dl className="divide-y divide-border">
              <Row icon={UserRound} label="Name">
                {student.guardianName}
                {student.guardianRelation && <span className="font-medium text-muted-foreground"> ({student.guardianRelation})</span>}
              </Row>
              <Row icon={Phone} label="Mobile">
                <a href={`tel:+88${student.guardianPhone}`} className="tabular-nums hover:text-primary">
                  {student.guardianPhone.replace(/^(01\d{3})(\d{6})$/, "$1-$2")}
                </a>
              </Row>
              <Row icon={Home} label="Address">
                {student.address || "Not given"}
              </Row>
            </dl>
          </Panel>
          <PortalAccessPanel studentId={student.id} studentName={student.name} guardianName={student.guardianName} access={access} canEdit={canEdit} now={now} />
        </div>
      </section>
    </>
  );
}

/** Params are read inside Suspense so navigation stays instant (Cache Components). */
export default function StudentPage({ params }: PageProps<"/dashboard/students/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <StudentProfile params={params} />
    </Suspense>
  );
}

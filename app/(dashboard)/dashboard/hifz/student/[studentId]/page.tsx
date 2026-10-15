import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { HifzHistory, ParaMap } from "@/components/dashboard/hifz";
import { PageHeader, Panel, PanelHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getHifzStudent } from "@/lib/hifz/queries";
import { canMarkSection } from "@/lib/institute/attendance-queries";

export const metadata = { title: "Hifz progress" };

async function Student({ params }: { params: Promise<{ studentId: string }> }) {
  const [viewer, { studentId }] = await Promise.all([requireInstituteMember("hifz:read"), params]);
  const instituteId = viewer.active.instituteId;
  const data = await getHifzStudent(instituteId, studentId);
  if (!data) notFound();
  const canWrite =
    can(viewer.active.role, "hifz:write") &&
    (await canMarkSection({ instituteId, memberId: viewer.active.memberId, role: viewer.active.role, sectionId: data.student.sectionId }));

  return (
    <>
      <Link href={`/dashboard/hifz/${data.student.sectionId}`} className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        {data.student.className} · {data.student.sectionName}
      </Link>
      <PageHeader title={data.student.name} description={`Roll ${data.student.roll} · hifz progress`} />
      <ParaMap studentId={data.student.id} paras={data.paras} canWrite={canWrite} />
      <Panel>
        <PanelHeader title="Recent lessons" description="The last 30 recorded days" />
        <HifzHistory logs={data.logs} />
      </Panel>
    </>
  );
}

export default function HifzStudentPage({ params }: PageProps<"/dashboard/hifz/student/[studentId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Student params={params} />
    </Suspense>
  );
}

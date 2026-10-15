import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/dashboard/attendance";
import { HifzSection } from "@/components/dashboard/hifz";
import { PageHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getHifzSection } from "@/lib/hifz/queries";
import { canMarkSection, dhakaDate } from "@/lib/institute/attendance-queries";
import { getRequestTime } from "@/lib/super-admin/queries";
import { dayLabel } from "@/lib/ui/labels";

export const metadata = { title: "Hifz lessons" };

async function Section({ params, searchParams }: PageProps<"/dashboard/hifz/[sectionId]">) {
  const [viewer, { sectionId }, query, now] = await Promise.all([requireInstituteMember("hifz:read"), params, searchParams, getRequestTime()]);
  const instituteId = viewer.active.instituteId;
  const allowed = await canMarkSection({ instituteId, memberId: viewer.active.memberId, role: viewer.active.role, sectionId });
  if (!allowed) redirect("/dashboard/hifz");
  const today = dhakaDate(now);
  const earliest = dhakaDate(now - 7 * 86_400_000);
  const asked = typeof query.date === "string" ? query.date : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today && asked >= earliest ? asked : today;
  const data = await getHifzSection(instituteId, sectionId, date);
  if (!data) notFound();
  const recorded = data.students.filter((s) => s.log).length;

  return (
    <>
      <Link href="/dashboard/hifz" className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        Hifz tracker
      </Link>
      <PageHeader
        title={`${data.section.className} · Section ${data.section.name}`}
        description={`${date === today ? "Today" : dayLabel(date)} · ${recorded} of ${data.students.length} lessons recorded`}
        actions={<DatePicker date={date} today={today} earliest={earliest} basePath={`/dashboard/hifz/${sectionId}`} />}
      />
      <HifzSection key={date} students={data.students} date={date} canWrite={can(viewer.active.role, "hifz:write")} />
    </>
  );
}

export default function HifzSectionPage(props: PageProps<"/dashboard/hifz/[sectionId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Section {...props} />
    </Suspense>
  );
}

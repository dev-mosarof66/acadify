import { Suspense } from "react";
import Link from "next/link";
import { BookOpenText } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, Panel } from "@/components/super-admin/ui";

import { requireInstituteMember } from "@/lib/auth/session";
import { dhakaDate, getSectionsForDay, marksAllSections } from "@/lib/institute/attendance-queries";
import { getRequestTime } from "@/lib/super-admin/queries";
import { SHIFT_LABELS } from "@/lib/ui/labels";

export const metadata = { title: "Hifz tracker" };

async function Hifz() {
  const [viewer, now] = await Promise.all([requireInstituteMember("hifz:read"), getRequestTime()]);
  const sections = await getSectionsForDay({ instituteId: viewer.active.instituteId, memberId: viewer.active.memberId, role: viewer.active.role, date: dhakaDate(now) });
  const all = marksAllSections(viewer.active.role);
  return (
    <>
      <PageHeader title="Hifz tracker" description="Daily sabak, sabki and dour, and each student's 30-para progress" />
      {sections.length === 0 ? (
        <Panel>
          <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
            <BookOpenText className="size-8 text-muted-foreground" />
            <p className="font-bold">No sections to show</p>
            <p className="max-w-sm text-sm text-muted-foreground">{all ? "Add your hifz class and its sections under Classes." : "Ask your principal to assign you to your hifz section under Teachers."}</p>
          </div>
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <li key={s.sectionId}>
              <Link href={`/dashboard/hifz/${s.sectionId}`} className="block h-full">
                <Panel className="h-full transition-colors hover:ring-primary/40">
                  <div className="grid gap-1 p-5">
                    <p className="font-extrabold">
                      {s.className} · {s.sectionName}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {SHIFT_LABELS[s.shift]} shift · {s.students} students
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">Record today&apos;s lessons →</p>
                  </div>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function HifzPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Hifz />
    </Suspense>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { IdCard } from "@/components/dashboard/id-card";
import { PrintPageButton } from "@/components/dashboard/exams";
import { Skeleton } from "@/components/ui/skeleton";
import { appUrl } from "@/lib/email/templates";
import { requireInstituteMember } from "@/lib/auth/session";
import { getClasses, getStudents } from "@/lib/institute/queries";

export const metadata = { title: "Student ID cards" };

async function IdCards({ searchParams }: { searchParams: PageProps<"/dashboard/students/id-cards">["searchParams"] }) {
  const [viewer, params] = await Promise.all([requireInstituteMember("students:read"), searchParams]);
  const [all, classes] = await Promise.all([getStudents(viewer.active.instituteId), getClasses(viewer.active.instituteId)]);
  const classId = typeof params.class === "string" ? params.class : "";
  const sectionId = typeof params.section === "string" ? params.section : "";
  const list = all.filter((s) => s.status === "active" && (!classId || s.classId === classId) && (!sectionId || s.sectionId === sectionId));
  const base = appUrl();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/students" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          All students
        </Link>
        <PrintPageButton label={`Print ${list.length} card${list.length === 1 ? "" : "s"}`} />
      </div>
      <form className="flex flex-wrap items-center gap-2 text-sm print:hidden">
        <select name="class" defaultValue={classId} className="h-10 rounded-xl border border-border bg-card px-3">
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-xl border border-border px-4 font-semibold">Filter</button>
      </form>
      {list.length ? (
        <div className="flex flex-wrap gap-3 print:gap-2">
          {list.map((s) => (
            <IdCard key={s.id} student={s} instituteName={viewer.active.instituteName} verifyUrl={`${base}/verify/student/${s.id}`} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">No active students to print.</p>
      )}
    </>
  );
}

export default function IdCardsPage(props: PageProps<"/dashboard/students/id-cards">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <IdCards searchParams={props.searchParams} />
    </Suspense>
  );
}

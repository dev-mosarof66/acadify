import { and, eq } from "drizzle-orm";
import { BadgeCheck, ShieldX } from "lucide-react";

import { classes, db, institutes, sections, students } from "@/lib/db";

export const metadata = { title: "Verify student ID", robots: { index: false } };

/** Public check behind the QR on a student ID card: shows only name, class and whether the student is still enrolled. */
export default async function VerifyStudent({ params }: PageProps<"/verify/student/[id]">) {
  const { id } = await params;
  const [row] = /^[0-9a-f-]{36}$/i.test(id)
    ? await db
        .select({ name: students.name, code: students.studentCode, status: students.status, className: classes.name, sectionName: sections.name, institute: institutes.name })
        .from(students)
        .innerJoin(classes, eq(students.classId, classes.id))
        .innerJoin(sections, eq(students.sectionId, sections.id))
        .innerJoin(institutes, eq(students.instituteId, institutes.id))
        .where(and(eq(students.id, id)))
        .limit(1)
    : [];
  const valid = row?.status === "active";

  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-content-center gap-4 px-4 text-center">
      {valid ? <BadgeCheck className="mx-auto size-14 text-primary" /> : <ShieldX className="mx-auto size-14 text-destructive" />}
      <h1 className="text-2xl font-extrabold">{valid ? "Valid student ID" : row ? "No longer enrolled" : "ID not found"}</h1>
      {row && (
        <div className="grid gap-1 text-sm">
          <p className="text-lg font-bold">{row.name}</p>
          <p>
            {row.className} · Section {row.sectionName} · ID {row.code}
          </p>
          <p className="text-muted-foreground">{row.institute}</p>
        </div>
      )}
    </main>
  );
}

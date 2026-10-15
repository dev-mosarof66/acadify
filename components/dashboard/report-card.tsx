import { roleLabel } from "@/lib/auth/rbac";
import type { getReportCard } from "@/lib/exams/queries";
import { cn } from "@/lib/utils";

type Card = NonNullable<Awaited<ReturnType<typeof getReportCard>>>;

/** A printable report card. Shared by the staff dashboard and the student/guardian portal. */
export function ReportCard({ card }: { card: Card }) {
  const { exam, row } = card;
  const gpa = exam.gradingScale === "gpa5";
  return (
    <article className="mx-auto grid w-full max-w-3xl gap-5 rounded-2xl border bg-card p-6 sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
      <header className="grid gap-1 border-b pb-4 text-center">
        <h1 className="text-xl font-extrabold">{card.institute.name}</h1>
        <p className="text-[13px] text-muted-foreground">{card.institute.district}</p>
        <p className="mt-2 text-sm font-bold tracking-wide uppercase">
          Report card · {exam.name}
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[12px] text-muted-foreground">Student</dt>
          <dd className="font-bold">{row.name}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Student ID</dt>
          <dd className="font-semibold tabular-nums">{row.studentCode}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Class</dt>
          <dd className="font-semibold">
            {card.section.className} · {card.section.name} · Roll {row.roll}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Guardian</dt>
          <dd className="font-semibold">{card.guardianName}</dd>
        </div>
      </dl>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-[12px] text-muted-foreground">
            <th className="py-2 font-semibold">Subject</th>
            <th className="py-2 text-right font-semibold">Full marks</th>
            <th className="py-2 text-right font-semibold">Marks</th>
            <th className="py-2 text-center font-semibold">Grade</th>
            {gpa && <th className="py-2 text-right font-semibold">Point</th>}
          </tr>
        </thead>
        <tbody>
          {card.subjects.map((sub) => {
            const s = row.subjects.find((x) => x.subjectId === sub.id)!;
            return (
              <tr key={sub.id} className="border-b border-dashed">
                <td className="py-2 font-semibold">{sub.name}</td>
                <td className="py-2 text-right tabular-nums">{sub.fullMarks}</td>
                <td className={cn("py-2 text-right font-bold tabular-nums", !s.passed && "text-destructive")}>{s.absent ? "Absent" : s.marks ?? "—"}</td>
                <td className={cn("py-2 text-center font-bold", !s.passed && "text-destructive")}>{s.marks === null && !s.absent ? "—" : s.grade}</td>
                {gpa && <td className="py-2 text-right tabular-nums">{s.marks === null && !s.absent ? "—" : (s.point ?? 0).toFixed(2)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary p-4 text-center sm:grid-cols-4 print:bg-transparent print:border">
        <div>
          <p className="text-[12px] text-muted-foreground">Total</p>
          <p className="text-lg font-extrabold tabular-nums">
            {row.result.total}/{row.result.fullTotal}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-muted-foreground">Percentage</p>
          <p className="text-lg font-extrabold tabular-nums">{row.result.percent}%</p>
        </div>
        <div>
          <p className="text-[12px] text-muted-foreground">{gpa ? "GPA" : "Result"}</p>
          <p className={cn("text-lg font-extrabold", row.result.complete && !row.result.passed && "text-destructive")}>
            {!row.result.complete ? "Pending" : gpa ? `${row.result.gpa?.toFixed(2)} (${row.result.grade})` : row.result.grade}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-muted-foreground">Merit position</p>
          <p className="text-lg font-extrabold tabular-nums">{row.position ? `${row.position} of ${card.classSize}` : "—"}</p>
        </div>
      </div>
      <footer className="mt-6 hidden grid-cols-3 gap-6 pt-10 text-center text-[12px] text-muted-foreground print:grid">
        <p className="border-t pt-1">Class teacher</p>
        <p className="border-t pt-1">Guardian</p>
        <p className="border-t pt-1">{roleLabel("principal", card.institute.type)}</p>
      </footer>
    </article>
  );
}

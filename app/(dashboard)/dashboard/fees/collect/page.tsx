import { Suspense } from "react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { BillsTable, CounterSearch, PaymentForm, PaymentsList } from "@/components/dashboard/fees";
import { taka } from "@/lib/fees/format";
import { PageHeader, Panel, PanelHeader } from "@/components/super-admin/ui";
import { can } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getCounterStudents, getStudentFees } from "@/lib/fees/queries";
import { getRequestTime } from "@/lib/super-admin/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Collect fees" };

async function Counter({ searchParams }: { searchParams: PageProps<"/dashboard/fees/collect">["searchParams"] }) {
  const [viewer, params, now] = await Promise.all([requireInstituteMember("fees:collect"), searchParams, getRequestTime()]);
  const instituteId = viewer.active.instituteId;
  const list = await getCounterStudents(instituteId);
  const studentId = typeof params.student === "string" ? params.student : "";
  const student = list.find((s) => s.id === studentId);
  const fees = student ? await getStudentFees(instituteId, student.id) : null;

  return (
    <>
      <PageHeader title="Collect fees" description="Find the student, take the payment, print the receipt" />
      <CounterSearch students={list} selectedId={student?.id} />
      {student && fees && (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid content-start gap-4">
            <Panel>
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/students/${student.id}`} className="text-lg font-extrabold hover:text-primary">
                    {student.name}
                  </Link>
                  <p className="text-[13px] text-muted-foreground">
                    {student.className} · {student.sectionName} · Roll {student.roll} · {student.code}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[12.5px] font-semibold text-muted-foreground">Owes</p>
                  <p className={cn("text-2xl font-extrabold tabular-nums", fees.outstanding ? "text-destructive" : "text-primary")}>{taka(fees.outstanding)}</p>
                </div>
              </div>
              {fees.outstanding > 0 && <PaymentForm key={student.id} studentId={student.id} owed={fees.outstanding} />}
            </Panel>
            <Panel>
              <PanelHeader title="Bills" />
              <BillsTable bills={fees.bills} canWaive={can(viewer.active.role, "fees:manage")} />
            </Panel>
          </div>
          <Panel>
            <PanelHeader title="Payments" />
            <PaymentsList payments={fees.payments} now={now} empty="No payments yet." />
          </Panel>
        </section>
      )}
    </>
  );
}

export default function CollectPage(props: PageProps<"/dashboard/fees/collect">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Counter searchParams={props.searchParams} />
    </Suspense>
  );
}

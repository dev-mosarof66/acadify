import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PrintButton } from "@/components/dashboard/fees";
import { ReceiptCopy } from "@/components/dashboard/receipt-copy";
import { getReceipt } from "@/lib/fees/queries";
import { requirePortalStudent } from "@/lib/portal/guard";

export const metadata = { title: "Receipt" };

async function Receipt({ params }: { params: Promise<{ studentId: string; id: string }> }) {
  const { studentId, id } = await params;
  const viewer = await requirePortalStudent(studentId);
  const r = await getReceipt(viewer.active.instituteId, id);
  if (!r || r.student.id !== studentId) notFound();

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/children/${studentId}`} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          {r.student.name}
        </Link>
        <PrintButton />
      </div>
      <div className="mx-auto grid w-full max-w-3xl">
        <ReceiptCopy r={r} label="Guardian's copy" />
      </div>
    </div>
  );
}

export default function PortalReceiptPage({ params }: PageProps<"/dashboard/children/[studentId]/receipts/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Receipt params={params} />
    </Suspense>
  );
}

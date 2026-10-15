import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PrintButton } from "@/components/dashboard/fees";
import { ReceiptCopy as Copy } from "@/components/dashboard/receipt-copy";
import { requireInstituteMember } from "@/lib/auth/session";
import { getReceipt } from "@/lib/fees/queries";

export const metadata = { title: "Receipt" };

async function Receipt({ params, searchParams }: PageProps<"/dashboard/fees/receipts/[id]">) {
  const [viewer, { id }, query] = await Promise.all([requireInstituteMember("fees:read"), params, searchParams]);
  const r = await getReceipt(viewer.active.instituteId, id);
  if (!r) notFound();

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/fees/collect" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          Back to the counter
        </Link>
        <PrintButton />
      </div>
      {query.new && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-primary-light px-4 py-3 text-sm font-semibold text-primary print:hidden">
          <CircleCheck className="size-4" />
          Payment saved. Print the receipt for the guardian.
        </p>
      )}
      <div className="mx-auto grid w-full max-w-3xl gap-6 print:max-w-none print:gap-8">
        <Copy r={r} label="Guardian's copy" />
        <Copy r={r} label="Office copy" />
      </div>
    </div>
  );
}

/** Params are read inside Suspense so navigation stays instant (Cache Components). */
export default function ReceiptPage(props: PageProps<"/dashboard/fees/receipts/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Receipt {...props} />
    </Suspense>
  );
}

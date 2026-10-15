import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { FeeHeadsBoard, NewFeeHeadButton } from "@/components/dashboard/fees";
import { PageHeader } from "@/components/super-admin/ui";
import { requireInstituteMember } from "@/lib/auth/session";
import { getFeeHeads } from "@/lib/fees/queries";
import { getClasses } from "@/lib/institute/queries";

export const metadata = { title: "Fee setup" };

async function Setup() {
  const viewer = await requireInstituteMember("fees:manage");
  const [heads, classes] = await Promise.all([getFeeHeads(viewer.active.instituteId), getClasses(viewer.active.instituteId)]);
  return (
    <>
      <PageHeader title="Fee setup" description="What your institute charges, and how much for each class" actions={<NewFeeHeadButton />} />
      <FeeHeadsBoard heads={heads} classes={classes} />
    </>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Setup />
    </Suspense>
  );
}

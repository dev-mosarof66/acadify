import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { AdminSetupForm } from "@/components/auth/admin-setup-form";
import { LoginIllustration } from "@/components/auth/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { hasSuperAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Super Admin Setup — Acadify",
  robots: { index: false, follow: false },
};

async function SetupGate() {
  const done = await hasSuperAdmin();
  return <AdminSetupForm alreadySetUp={done} />;
}

export default function Page() {
  return (
    <AuthShell illustration={<LoginIllustration />}>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <SetupGate />
      </Suspense>
    </AuthShell>
  );
}

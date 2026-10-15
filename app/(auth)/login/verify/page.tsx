import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdminVerifyPage from "@/components/auth/admin-verify-page";
import { getViewer, homeFor } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Confirm It's You — Acadify",
  robots: { index: false, follow: false },
};

/** Second sign-in step for admin accounts: only reachable after the password step. */
async function VerifyGate() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.needsAdminCode || viewer.adminVerified) redirect(homeFor(viewer));
  return <AdminVerifyPage email={viewer.email} />;
}

export default function Page() {
  return (
    // Suspense: reads the session cookie
    <Suspense>
      <VerifyGate />
    </Suspense>
  );
}

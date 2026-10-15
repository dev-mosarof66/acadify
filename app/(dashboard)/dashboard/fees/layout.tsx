import { Suspense } from "react";

import { FeeTabs } from "@/components/dashboard/fees";
import { requireInstituteMember } from "@/lib/auth/session";

async function Tabs() {
  const viewer = await requireInstituteMember("fees:read");
  return <FeeTabs role={viewer.active.role} />;
}

/** Shared tab bar for the fee pages (hidden when printing a receipt). */
export default function FeesLayout({ children }: LayoutProps<"/dashboard/fees">) {
  return (
    <>
      <div className="print:hidden">
        <Suspense fallback={null}>
          <Tabs />
        </Suspense>
      </div>
      {children}
    </>
  );
}

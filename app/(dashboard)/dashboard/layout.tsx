import { Suspense } from "react";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountMenu } from "@/components/global/account-menu";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { requireInstituteMember } from "@/lib/auth/session";
import { getLinkedStudents, isPortalRole } from "@/lib/portal/queries";

export const metadata: Metadata = {
  title: { default: "Dashboard — Acadify", template: "%s — Acadify" },
  robots: { index: false, follow: false },
};

/** Institute area: only signed-in members of an institute get past this. */
async function DashboardShell({ children }: { children: React.ReactNode }) {
  const viewer = await requireInstituteMember();
  const portalChildren = isPortalRole(viewer.active.role) ? (await getLinkedStudents(viewer.active.memberId)).map((s) => ({ id: s.id, name: s.name })) : undefined;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <DashboardSidebar role={viewer.active.role} instituteName={viewer.active.instituteName} portalChildren={portalChildren} />
        <SidebarInset className="min-w-0 bg-secondary/40">
          <DashboardTopbar account={<AccountMenu name={viewer.name} email={viewer.email} roleLabel={ROLE_LABELS[viewer.active.role]} area="user" />} />
          <div className="mx-auto grid w-full max-w-[1300px] gap-6 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Checking your access">
      <Skeleton className="hidden w-64 rounded-none md:block" />
      <div className="grid flex-1 content-start gap-6 p-6">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-[24px]" />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

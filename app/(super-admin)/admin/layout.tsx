import { Suspense } from "react";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountMenu } from "@/components/global/account-menu";
import { AppSidebar } from "@/components/super-admin/app-sidebar";
import { NewDemosBadge } from "@/components/super-admin/new-demos-badge";
import { Topbar } from "@/components/super-admin/topbar";
import { requireSuperAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Super Admin — Acadify", template: "%s — Acadify Admin" },
  robots: { index: false, follow: false },
};

/** Renders the console only after the server confirms a super admin session. */
async function AdminShell({ children }: { children: React.ReactNode }) {
  const viewer = await requireSuperAdmin();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          newDemosBadge={
            <Suspense fallback={null}>
              <NewDemosBadge />
            </Suspense>
          }
        />
        <SidebarInset className="min-w-0 bg-secondary/40">
          <Topbar account={<AccountMenu name={viewer.name} email={viewer.email} roleLabel="Super Admin" area="admin" />} />
          <div className="mx-auto grid w-full max-w-[1400px] gap-6 p-4 sm:p-6">{children}</div>
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
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

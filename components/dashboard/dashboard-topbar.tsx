"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/global/theme-toggle";
import { DASHBOARD_NAV } from "@/components/dashboard/dashboard-sidebar";

export function DashboardTopbar({ account }: { account: React.ReactNode }) {
  const pathname = usePathname();
  const section = [...DASHBOARD_NAV].reverse().find((n) => (n.href === "/dashboard" ? pathname === n.href : pathname.startsWith(n.href)));

  return (
    <header className="sticky top-0 z-20 flex h-16 print:hidden items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <nav aria-label="Breadcrumb" className="min-w-0 truncate text-sm font-bold">
        {section ? <Link href={section.href}>{section.title}</Link> : "Dashboard"}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {account}
      </div>
    </header>
  );
}

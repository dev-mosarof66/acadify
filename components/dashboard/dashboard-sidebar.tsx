"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpenText, BookMarked, FileText, GraduationCap, House, LayoutDashboard, ListChecks, School, UserRound, UserRoundCog, Users, Wallet } from "lucide-react";

import logoImg from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { can, type InstituteRole, type Permission } from "@/lib/auth/rbac";

/** Sections and the permission needed to see them; a role only sees what it can open. */
export const DASHBOARD_NAV: { title: string; href: string; icon: React.ElementType; permission?: Permission }[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Attendance", href: "/dashboard/attendance", icon: ListChecks, permission: "attendance:read" },
  { title: "Students", href: "/dashboard/students", icon: Users, permission: "students:read" },
  { title: "Fees", href: "/dashboard/fees", icon: Wallet, permission: "fees:read" },
  { title: "Exams & results", href: "/dashboard/exams", icon: Award, permission: "exams:read" },
  { title: "Hifz tracker", href: "/dashboard/hifz", icon: BookOpenText, permission: "hifz:read" },
  { title: "Lecture sheets", href: "/dashboard/sheets", icon: FileText, permission: "sheets:read" },
  { title: "Classes", href: "/dashboard/classes", icon: School, permission: "institute:settings" },
  { title: "Subjects", href: "/dashboard/subjects", icon: BookMarked, permission: "institute:settings" },
  { title: "Teachers", href: "/dashboard/teachers", icon: GraduationCap, permission: "institute:settings" },
  { title: "Staff", href: "/dashboard/staff", icon: UserRoundCog, permission: "members:manage" },
];

/**
 * Staff see the sections their role can open. Students and guardians (`portalChildren` set) see
 * their home and one entry per linked student.
 */
export function DashboardSidebar({ role, instituteName, portalChildren }: { role: InstituteRole; instituteName: string; portalChildren?: { id: string; name: string }[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const nav = portalChildren
    ? [
        { title: "Home", href: "/dashboard", icon: House },
        ...portalChildren.map((c) => ({ title: c.name, href: `/dashboard/children/${c.id}`, icon: UserRound })),
      ]
    : DASHBOARD_NAV.filter((n) => !n.permission || can(role, n.permission));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />} className="gap-3">
              <Image src={logoImg} alt="" width={32} height={32} className="size-8 shrink-0 object-contain" />
              <span className="grid min-w-0 leading-tight">
                <span className="text-[15px] font-extrabold tracking-tight">Acadify</span>
                <span className="truncate text-[11px] font-semibold text-primary">{instituteName}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{portalChildren ? "Portal" : "Institute"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    className="font-semibold data-active:bg-primary-light data-active:text-primary"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

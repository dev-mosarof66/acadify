"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpenText, BookMarked, FileText, GraduationCap, House, LayoutDashboard, ListChecks, School, Sparkles, UserRound, UserRoundCog, Users, Utensils, Wallet } from "lucide-react";

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

type NavItem = { title: string; href: string; icon: React.ElementType; permission?: Permission };

/** Sections and the permission needed to see them, grouped by task. A role only sees the groups it can open. */
const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [{ title: "Overview", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Students",
    items: [
      { title: "Students", href: "/dashboard/students", icon: Users, permission: "students:read" },
      { title: "Attendance", href: "/dashboard/attendance", icon: ListChecks, permission: "attendance:read" },
      { title: "Hifz tracker", href: "/dashboard/hifz", icon: BookOpenText, permission: "hifz:read" },
      { title: "Boarding", href: "/dashboard/boarding", icon: Utensils, permission: "boarding:read" },
    ],
  },
  {
    label: "Academics",
    items: [
      { title: "Exams & results", href: "/dashboard/exams", icon: Award, permission: "exams:read" },
      { title: "AI Exam Studio", href: "/dashboard/exam-studio", icon: Sparkles, permission: "exams:write" },
      { title: "Lecture sheets", href: "/dashboard/sheets", icon: FileText, permission: "sheets:read" },
    ],
  },
  { label: "Finance", items: [{ title: "Fees", href: "/dashboard/fees", icon: Wallet, permission: "fees:read" }] },
  {
    label: "Setup",
    items: [
      { title: "Classes", href: "/dashboard/classes", icon: School, permission: "institute:settings" },
      { title: "Subjects", href: "/dashboard/subjects", icon: BookMarked, permission: "institute:settings" },
      { title: "Teachers", href: "/dashboard/teachers", icon: GraduationCap, permission: "institute:settings" },
      { title: "Staff", href: "/dashboard/staff", icon: UserRoundCog, permission: "members:manage" },
    ],
  },
];

/** Every section in one list (the top bar uses it to show the current page's name). */
export const DASHBOARD_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Staff see the sections their role can open. Students and guardians (`portalChildren` set) see
 * their home and one entry per linked student.
 */
export function DashboardSidebar({ role, instituteName, portalChildren }: { role: InstituteRole; instituteName: string; portalChildren?: { id: string; name: string }[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const groups: { label?: string; items: NavItem[] }[] = portalChildren
    ? [
        {
          label: "Portal",
          items: [
            { title: "Home", href: "/dashboard", icon: House },
            ...portalChildren.map((child) => ({ title: child.name, href: `/dashboard/children/${child.id}`, icon: UserRound })),
          ],
        },
      ]
    : NAV_GROUPS.map((g) => ({ label: g.label, items: g.items.filter((n) => !n.permission || can(role, n.permission)) })).filter((g) => g.items.length > 0);

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
        {groups.map((group, i) => (
          <SidebarGroup key={group.label ?? i}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

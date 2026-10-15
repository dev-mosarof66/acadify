"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareText,
  Package,
  Settings,
  ShieldCheck,
  MessageCircleQuestion,
} from "lucide-react";

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

const MAIN_NAV = [
  { title: "Overview", href: "/admin", icon: LayoutDashboard },
  { title: "Institutes", href: "/admin/institutes", icon: Building2 },
  { title: "Demo Requests", href: "/admin/demo-requests", icon: Inbox, badge: true },
  { title: "Billing", href: "/admin/billing", icon: CreditCard },
  { title: "Plans & Pricing", href: "/admin/plans", icon: Package },
  { title: "FAQs", href: "/admin/faqs", icon: MessageCircleQuestion },
  { title: "SMS Gateway", href: "/admin/sms", icon: MessageSquareText },
  { title: "Support Tickets", href: "/admin/support", icon: LifeBuoy },
  { title: "Platform Settings", href: "/admin/settings", icon: Settings },
];

/** `newDemosBadge` is rendered by the server layout (it reads the database inside Suspense). */
export function AppSidebar({ newDemosBadge }: { newDemosBadge?: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />} className="gap-3">
              <Image src={logoImg} alt="" width={32} height={32} className="size-8 shrink-0 object-contain" />
              <span className="grid leading-tight">
                <span className="text-[15px] font-extrabold tracking-tight">Acadify</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="size-3" />
                  Super Admin
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV.map((item) => {
                return (
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
                    {"badge" in item && item.badge && newDemosBadge}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;

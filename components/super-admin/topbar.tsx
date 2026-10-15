"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/global/theme-toggle";

const SECTION_TITLES: Record<string, string> = {
  "": "Overview",
  institutes: "Institutes",
  "demo-requests": "Demo Requests",
  billing: "Billing",
  plans: "Plans & Pricing",
  faqs: "FAQs",
  settings: "Platform Settings",
  sms: "SMS Gateway",
  support: "Support Tickets",
};

/** "noor-academy" -> "Noor Academy" (the page itself shows the exact name). */
const titleFromSlug = (slug: string) => decodeURIComponent(slug).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function useCrumbs() {
  const pathname = usePathname();
  const parts = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const crumbs = [{ label: SECTION_TITLES[parts[0] ?? ""] ?? "Overview", href: `/admin${parts[0] ? `/${parts[0]}` : ""}` }];
  if (parts[0] === "institutes" && parts[1]) {
    crumbs.push({ label: titleFromSlug(parts[1]), href: pathname });
  }
  return crumbs;
}

export function Topbar({ account }: { account?: React.ReactNode }) {
  const crumbs = useCrumbs();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <SidebarTrigger className="-ml-1 size-9 rounded-lg" />
      <Separator orientation="vertical" className="h-5" />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex min-w-0 items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            {i < crumbs.length - 1 ? (
              <Link href={c.href} className="font-semibold text-muted-foreground hover:text-primary">
                {c.label}
              </Link>
            ) : (
              <span className="truncate font-bold">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {account}
      </div>
    </header>
  );
}

export default Topbar;

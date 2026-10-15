"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import logoImg from "@/assets/logo.png";
import {
  Sparkles,
  Zap,
  CreditCard,
  Calendar,
  Award,
  School,
  BookOpen,
  Building2,
  FileSpreadsheet,
  BookMarked,
  Users,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/global/theme-toggle";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border/80 shadow-xs"
          : "bg-background/70 backdrop-blur-sm border-b border-border/50"
      )}
    >
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-2.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-lg transition-transform active:scale-95"
            aria-label="Acadify Home"
          >
            {/* Logo Image from assets */}
            <div>
              <Image
                src={logoImg}
                alt="Acadify Logo"
                width={36}
                height={36}
                className="size-7 lg:size-8 object-contain transition-transform duration-300 group-hover:-rotate-3"
                priority
              />
            </div>

            {/* Logo Typography */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {t("app.title")}
                </span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline-block -mt-1 tracking-wider">
                {t("app.subtitle")}
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Menu */}
        <nav className="hidden xl:flex items-center">
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              {/* Dropdown 1: 1-Click OS Automations */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="gap-1.5 font-medium text-sm hover:text-primary hover:bg-transparent data-open:bg-transparent data-open:text-primary transition-colors">
                  <Zap className="size-3.5 text-amber-500 fill-amber-500/20" />
                  <span>{t("nav.automations")}</span>
                  <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    {t("nav.automations_tag")}
                  </span>
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-3 w-140 md:w-155">
                  <div className="mb-2.5 flex items-center justify-between border-b border-border/60 pb-2 px-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground tracking-tight">
                        {t("nav.automations_heading")}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t("nav.automations_subheading")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <NavigationMenuLink
                      href="/#one-click-sms"
                      className="group flex flex-col items-start gap-1 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                          <Zap className="size-4" />
                        </div>
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("action.one_click_sms")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-8">
                        {t("nav.sms_desc")}
                      </p>
                    </NavigationMenuLink>

                    <NavigationMenuLink
                      href="/#one-click-fee"
                      className="group flex flex-col items-start gap-1 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                          <CreditCard className="size-4" />
                        </div>
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("action.one_click_fee")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-8">
                        {t("nav.fee_desc")}
                      </p>
                    </NavigationMenuLink>

                    <NavigationMenuLink
                      href="/#one-click-routine"
                      className="group flex flex-col items-start gap-1 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                          <Calendar className="size-4" />
                        </div>
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("action.one_click_routine")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-8">
                        {t("nav.routine_desc")}
                      </p>
                    </NavigationMenuLink>

                    <NavigationMenuLink
                      href="/#one-click-tabulation"
                      className="group flex flex-col items-start gap-1 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                          <Award className="size-4" />
                        </div>
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("action.one_click_tabulation")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-8">
                        {t("nav.tabulation_desc")}
                      </p>
                    </NavigationMenuLink>
                  </div>

                  <div className="mt-3 rounded-lg bg-muted/40 p-2.5 flex items-center justify-between border border-border/40">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="size-4 text-primary" />
                      <span>{t("nav.backup_sync")}</span>
                    </div>
                    <Link
                      href="/#features"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      {t("nav.view_all")}
                      <ChevronRight className="size-3" />
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Dropdown 2: Institutions */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="gap-1.5 font-medium text-sm hover:text-primary hover:bg-transparent data-open:bg-transparent data-open:text-primary transition-colors">
                  <Building2 className="size-3.5 text-primary" />
                  <span>{t("nav.institution_type")}</span>
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-3 w-[460px] md:w-[500px]">
                  <div className="grid gap-2">
                    <NavigationMenuLink
                      href="/#school-college"
                      className="group flex items-start gap-3 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 transition-colors shrink-0">
                        <School className="size-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("mode.school")}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("nav.school_desc")}
                        </p>
                      </div>
                    </NavigationMenuLink>

                    <NavigationMenuLink
                      href="/#madrasah"
                      className="group flex items-start gap-3 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                        <BookOpen className="size-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("mode.madrasah")}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("nav.madrasah_desc")}
                        </p>
                      </div>
                    </NavigationMenuLink>

                    <NavigationMenuLink
                      href="/#unified-campus"
                      className="group flex items-start gap-3 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20 transition-colors shrink-0">
                        <Building2 className="size-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("mode.combined")}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("nav.combined_desc")}
                        </p>
                      </div>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Dropdown 3: Academic Hub */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="gap-1.5 font-medium text-sm hover:text-primary hover:bg-transparent data-open:bg-transparent data-open:text-primary transition-colors">
                  <BookMarked className="size-3.5 text-primary" />
                  <span>{t("nav.academics")}</span>
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-3 w-[420px]">
                  <div className="grid gap-1.5">
                    <NavigationMenuLink
                      href="/#lecture-sheets"
                      className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <BookMarked className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("nav.lecture_sheets")}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {t("nav.lecture_sheets_desc")}
                        </p>
                      </div>
                    </NavigationMenuLink>

                    <NavigationMenuLink
                      href="/#attendance"
                      className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("nav.attendance")}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {t("nav.attendance_desc")}
                        </p>
                      </div>
                    </NavigationMenuLink>

                    <NavigationMenuLink
                      href="/#reports"
                      className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <FileSpreadsheet className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {t("nav.reports")}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {t("nav.reports_desc")}
                        </p>
                      </div>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Direct Link 1: Pricing */}
              <NavigationMenuItem>
                <Link
                  href="/#pricing"
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "font-medium text-sm text-foreground/80 hover:text-primary hover:bg-transparent transition-colors"
                  )}
                >
                  {t("nav.pricing")}
                </Link>
              </NavigationMenuItem>

              {/* Direct Link 2: Why Acadify */}
              <NavigationMenuItem>
                <Link
                  href="/#why-acadify"
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "font-medium text-sm text-foreground/80 hover:text-primary hover:bg-transparent transition-colors"
                  )}
                >
                  {t("nav.why_acadify")}
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        {/* Right: Controls & CTAs */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggle />

          {/* Primary CTA: Launch / Portal */}
          <Button
            nativeButton={false}
            render={<Link href="/login" />}
            className="hidden h-11 gap-2.5 rounded-full pr-1.5 pl-5 text-[13.5px] font-bold shadow-[0_10px_22px_-10px_var(--primary)] hover:-translate-y-px hover:bg-primary-hover sm:inline-flex"
          >
            <span>{t("nav.portal")}</span>
            <span className="grid size-8 place-items-center rounded-full bg-primary-foreground text-primary">
              <ArrowRight className="size-4" strokeWidth={2.4} />
            </span>
          </Button>

          {/* Mobile Menu Hamburger Button */}
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden size-9 rounded-lg hover:bg-transparent hover:text-primary transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="size-5 text-foreground" />
            ) : (
              <Menu className="size-5 text-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-border bg-background/95 backdrop-blur-xl px-4 pt-3 pb-6 animate-in slide-in-from-top-3 duration-200 shadow-xl">
          <div className="flex flex-col gap-4">
            {/* Quick 1-Click Automations Section */}
            <div>
              <div className="flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                <Zap className="size-3 text-amber-500" />
                <span>{t("nav.automations")}</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                <Link
                  href="/#one-click-sms"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-transparent hover:text-primary transition-colors text-sm font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <span>{t("action.one_click_sms")}</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/#one-click-fee"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-transparent hover:text-primary transition-colors text-sm font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-2 rounded-full bg-blue-500" />
                    <span>{t("action.one_click_fee")}</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/#one-click-routine"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-transparent hover:text-primary transition-colors text-sm font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-2 rounded-full bg-purple-500" />
                    <span>{t("action.one_click_routine")}</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/#one-click-tabulation"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-transparent hover:text-primary transition-colors text-sm font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-2 rounded-full bg-amber-500" />
                    <span>{t("action.one_click_tabulation")}</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </div>
            </div>

            {/* Institutions Section */}
            <div className="border-t border-border/60 pt-3">
              <div className="flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                <Building2 className="size-3 text-primary" />
                <span>{t("nav.institution_type")}</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                <Link
                  href="/#school-college"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-transparent hover:text-primary transition-colors text-sm font-medium"
                >
                  <School className="size-4 text-blue-500" />
                  <span>{t("mode.school")}</span>
                </Link>

                <Link
                  href="/#madrasah"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-transparent hover:text-primary transition-colors text-sm font-medium"
                >
                  <BookOpen className="size-4 text-emerald-500" />
                  <span>{t("mode.madrasah")}</span>
                </Link>

                <Link
                  href="/#unified-campus"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-transparent hover:text-primary transition-colors text-sm font-medium"
                >
                  <Building2 className="size-4 text-indigo-500" />
                  <span>{t("mode.combined")}</span>
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div className="border-t border-border/60 pt-3 flex flex-col gap-1">
              <Link
                href="/#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-transparent hover:text-primary transition-colors text-sm font-medium"
              >
                <span>{t("nav.pricing")}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              <Link
                href="/#why-acadify"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-transparent hover:text-primary transition-colors text-sm font-medium"
              >
                <span>{t("nav.why_acadify")}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </div>

            {/* Bottom Actions for Mobile */}
            <div className="border-t border-border/60 pt-3 flex flex-col gap-2">
              <Button
                className="w-full justify-center font-semibold text-sm gap-2"
                nativeButton={false}
                render={<Link href="/login" onClick={() => setMobileMenuOpen(false)} />}
              >
                <span>{t("nav.portal")}</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;

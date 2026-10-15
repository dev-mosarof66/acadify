"use client";

import { Building2, Landmark, School } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { ArrowLink, CheckItem, FEATURED_GRADIENT, LandingCard, SectionHeader } from "@/components/landing/shared";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "school-college", key: "school", title: "mode.school", desc: "nav.school_desc", icon: School },
  { id: "madrasah", key: "madrasah", title: "mode.madrasah", desc: "nav.madrasah_desc", icon: Landmark, featured: true },
  { id: "unified-campus", key: "combined", title: "mode.combined", desc: "nav.combined_desc", icon: Building2 },
] as const;

export function Institutions() {
  const { t } = useLocale();

  return (
    <section id="institutions" className="mb-20 scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <SectionHeader tag={t("institutions.tag")} title={t("institutions.title")} description={t("institutions.description")} />

      <div className="grid gap-4 md:grid-cols-3">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const featured = "featured" in mode && mode.featured;
          return (
            <LandingCard
              id={mode.id}
              key={mode.id}
              className={cn("relative scroll-mt-28 rounded-[22px] p-7 py-7", featured && FEATURED_GRADIENT)}
            >
              {featured && (
                <Badge className="absolute top-6 right-6 h-auto rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
                  {t("institutions.popular")}
                </Badge>
              )}
              <span className={cn("grid size-[66px] place-items-center rounded-full", featured ? "bg-white/15" : "bg-primary-light")}>
                <Icon className={cn("size-[30px]", featured ? "text-white" : "text-primary")} />
              </span>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight">{t(mode.title)}</h3>
                <p className={cn("mt-1.5 text-sm", featured ? "text-white/80" : "text-muted-foreground")}>{t(mode.desc)}</p>
              </div>
              <ul className={cn("grid flex-1 gap-2.5 text-sm font-medium", featured && "[&_svg]:text-white")}>
                {[1, 2, 3, 4].map((n) => (
                  <CheckItem key={n}>{t(`institutions.${mode.key}_p${n}`)}</CheckItem>
                ))}
              </ul>
              <div className={cn("mt-2 border-t pt-4", featured ? "border-white/20" : "border-border")}>
                <ArrowLink
                  href="/contact"
                  className={cn("w-full justify-between", featured && "text-white")}
                  dotClassName={cn("size-7", featured && "bg-white text-primary-dark")}
                >
                  {t("modules.learn_more")}
                </ArrowLink>
              </div>
            </LandingCard>
          );
        })}
      </div>
    </section>
  );
}

export default Institutions;

"use client";

import { ChevronLeft, ChevronRight, GraduationCap, Landmark, School } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ArrowLink, LandingCard, SectionTag } from "@/components/landing/shared";

const RESULTS = [
  { key: "school", icon: School },
  { key: "madrasah", icon: Landmark },
  { key: "college", icon: GraduationCap },
] as const;

export function Results() {
  const { t } = useLocale();

  return (
    <section id="results" className="mb-14 scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionTag>{t("results.tag")}</SectionTag>
          <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-balance sm:text-[32px]">{t("results.title")}</h2>
        </div>
        <ArrowLink href="#results">{t("results.view_all")}</ArrowLink>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {RESULTS.map(({ key, icon: Icon }) => (
          <LandingCard
            key={key}
            className="relative flex-row items-center gap-[18px] rounded-[18px] p-[22px] py-[22px] after:absolute after:top-1/2 after:-right-[30px] after:size-[110px] after:-translate-y-1/2 after:rounded-full after:bg-secondary"
          >
            <span className="relative z-10 grid size-[70px] shrink-0 place-items-center rounded-full bg-primary-light">
              <Icon className="size-[30px] text-primary" />
            </span>
            <div className="relative z-10">
              <p className="text-[13px] font-bold">{t(`results.${key}_kind`)}</p>
              <p className="text-[28px] leading-tight font-extrabold tracking-tight text-primary tabular-nums">{t(`results.${key}_value`)}</p>
              <p className="text-[12.5px] leading-snug text-muted-foreground">{t(`results.${key}_desc`)}</p>
            </div>
          </LandingCard>
        ))}
      </div>

      <figure className="grid items-center gap-3.5 rounded-[20px] bg-secondary p-6 md:grid-cols-[auto_auto_1fr_auto_auto_auto] md:gap-6 md:px-[22px]">
        <Button variant="outline" size="icon" aria-label={t("results.prev")} className="hidden size-10 rounded-full bg-card md:inline-flex">
          <ChevronLeft />
        </Button>
        <span aria-hidden className="pt-6 font-serif text-[72px] leading-[0.6] font-extrabold text-primary">&ldquo;</span>
        <blockquote className="text-[15.5px] font-medium">{t("results.quote")}</blockquote>
        <figcaption className="flex items-center gap-3">
          <span className="grid size-[52px] place-items-center rounded-full bg-gradient-to-br from-primary-bright to-primary-dark font-extrabold text-white">MR</span>
          <span>
            <b className="block text-[14.5px]">{t("results.quote_name")}</b>
            <span className="text-[12.5px] text-muted-foreground">{t("results.quote_role")}</span>
          </span>
        </figcaption>
        <span className="text-lg tracking-[3px] whitespace-nowrap text-accent" role="img" aria-label={t("results.rating")}>
          ★★★★★
        </span>
        <Button variant="outline" size="icon" aria-label={t("results.next")} className="hidden size-10 rounded-full bg-card md:inline-flex">
          <ChevronRight />
        </Button>
      </figure>
    </section>
  );
}

export default Results;

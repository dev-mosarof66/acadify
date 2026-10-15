"use client";

import { BookOpenText, Compass, Eye, HeartHandshake, Languages, Lock, Sparkles, Target } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { PageHero } from "@/components/company/page-hero";
import { CheckItem, FEATURED_GRADIENT, LandingCard, PillLink, SectionHeader, SectionTag } from "@/components/landing/shared";
import CtaBand from "@/components/landing/cta-band";
import { companyContent } from "@/lib/content/company";
import { cn } from "@/lib/utils";

const VALUE_ICONS = [HeartHandshake, Sparkles, Languages, Lock];

export function AboutPage({ trialDays }: { trialDays: number }) {
  const { t, locale } = useLocale();
  const c = companyContent.about[locale];

  return (
    <>
      <PageHero homeLabel={t("footer.home")} tag={c.tag} title={c.title} highlight={c.highlight} description={c.description}>
        <div className="mt-4 flex flex-wrap justify-center gap-3.5">
          <PillLink href="/#contact">{t("hero.cta_primary")}</PillLink>
          <PillLink href="/#features" tone="outline">
            {t("hero.cta_secondary")}
          </PillLink>
        </div>
      </PageHero>

      {/* Story + mission/vision */}
      <section className="grid items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-14">
        <div className="grid justify-items-start gap-4">
          <SectionTag>{c.storyTag}</SectionTag>
          <h2 className="text-[26px] font-extrabold tracking-tight text-balance sm:text-4xl">{c.storyTitle}</h2>
          {c.story.map((p, i) => (
            <p key={i} className="max-w-[60ch] leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </div>

        <div className="relative grid gap-4">
          <div aria-hidden className="absolute inset-[10%] -z-10 rounded-full bg-primary-light blur-2xl" />
          <LandingCard raised className={cn("rounded-[22px] p-7 py-7", FEATURED_GRADIENT)}>
            <span className="grid size-[54px] place-items-center rounded-full bg-white/15">
              <Target className="size-6" />
            </span>
            <h3 className="text-xl font-extrabold">{c.missionTitle}</h3>
            <p className="leading-relaxed text-white/85">{c.mission}</p>
          </LandingCard>
          <LandingCard raised className="rounded-[22px] p-7 py-7">
            <span className="grid size-[54px] place-items-center rounded-full bg-primary-light">
              <Eye className="size-6 text-primary" />
            </span>
            <h3 className="text-xl font-extrabold">{c.visionTitle}</h3>
            <p className="leading-relaxed text-muted-foreground">{c.vision}</p>
          </LandingCard>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary px-4 py-16 sm:px-6 lg:px-14">
        <SectionHeader tag={c.valuesTag} title={c.valuesTitle} description={c.valuesDescription} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {c.values.map((v, i) => {
            const Icon = VALUE_ICONS[i] ?? Compass;
            return (
              <LandingCard
                key={v.title}
                className="rounded-[22px] p-7 py-7 transition-all hover:-translate-y-[3px] hover:shadow-[0_14px_34px_-14px_rgba(14,26,18,0.18)] hover:ring-primary-bright"
              >
                <span className="grid size-[66px] place-items-center rounded-full bg-primary-light">
                  <Icon className="size-[30px] text-primary" />
                </span>
                <h3 className="text-lg font-extrabold tracking-tight">{v.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </LandingCard>
            );
          })}
        </div>
      </section>

      {/* Promise */}
      <section className="px-4 py-20 sm:px-6 lg:px-14">
        <LandingCard raised className="grid items-center gap-8 rounded-[24px] p-8 py-8 sm:p-10 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="grid justify-items-start gap-4">
            <SectionTag>{c.promiseTag}</SectionTag>
            <h2 className="text-[26px] font-extrabold tracking-tight text-balance sm:text-[32px]">{c.promiseTitle}</h2>
            <span className="grid size-[66px] place-items-center rounded-full bg-primary-light">
              <BookOpenText className="size-[30px] text-primary" />
            </span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {c.promises.map((p) => (
              <CheckItem key={p} className="rounded-2xl bg-secondary p-5 font-semibold">
                {p}
              </CheckItem>
            ))}
          </ul>
        </LandingCard>
      </section>

      <CtaBand trialDays={trialDays} />
    </>
  );
}

export default AboutPage;

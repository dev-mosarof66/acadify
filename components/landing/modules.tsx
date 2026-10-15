"use client";

import { Award, BookOpenText, ChartColumn, FileText, ListChecks, Wallet } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { ArrowLink, LandingCard, SectionHeader } from "@/components/landing/shared";

const MODULES = [
  { key: "attendance", icon: ListChecks, href: "#one-click-sms" },
  { key: "fees", icon: Wallet, href: "#one-click-fee" },
  { key: "exams", icon: Award, href: "#one-click-tabulation" },
  { key: "hifz", icon: BookOpenText, href: "#madrasah" },
  { key: "sheets", icon: FileText, href: "#lecture-sheets" },
  { key: "reports", icon: ChartColumn, href: "#reports" },
] as const;

export function Modules() {
  const { t } = useLocale();

  return (
    <section id="modules" className="mb-16 scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <SectionHeader tag={t("modules.tag")} title={t("modules.title")} description={t("modules.description")} />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 xl:grid-cols-6">
        {MODULES.map(({ key, icon: Icon, href }) => (
          <LandingCard
            key={key}
            className="items-center gap-2.5 rounded-[18px] px-3 pt-5 pb-3 text-center transition-all hover:-translate-y-[3px] hover:shadow-[0_14px_34px_-14px_rgba(14,26,18,0.18)] hover:ring-primary-bright sm:px-4 sm:pt-[22px] sm:pb-4"
          >
            <span className="mb-1 grid size-[66px] place-items-center rounded-full bg-primary-light">
              <Icon className="size-[30px] text-primary" />
            </span>
            <h3 className="text-[15px] font-extrabold tracking-tight">{t(`modules.${key}_title`)}</h3>
            <p className="text-[12.5px] leading-normal text-muted-foreground">{t(`modules.${key}_desc`)}</p>
            <ArrowLink href={href} className="mt-auto w-full justify-between pt-2.5 text-[12.5px]">
              {t("modules.learn_more")}
            </ArrowLink>
          </LandingCard>
        ))}
      </div>
    </section>
  );
}

export default Modules;

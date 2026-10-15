"use client";

import { BookMarked, FileSpreadsheet, Users } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { CheckItem, LandingCard, SectionHeader } from "@/components/landing/shared";

const ITEMS = [
  { id: "lecture-sheets", key: "sheets", title: "nav.lecture_sheets", icon: BookMarked },
  { id: "attendance", key: "attendance", title: "nav.attendance", icon: Users },
  { id: "reports", key: "reports", title: "nav.reports", icon: FileSpreadsheet },
] as const;

export function AcademicHub() {
  const { t } = useLocale();

  return (
    <section id="academic-hub" className="mb-20 scroll-mt-24 bg-secondary px-4 py-16 sm:px-6 lg:px-14">
      <SectionHeader tag={t("academic.tag")} title={t("academic.title")} description={t("academic.description")} />

      <div className="grid gap-4 md:grid-cols-3">
        {ITEMS.map(({ id, key, title, icon: Icon }) => (
          <LandingCard
            id={id}
            key={id}
            className="scroll-mt-28 rounded-[22px] p-7 py-7 transition-all hover:-translate-y-[3px] hover:shadow-[0_14px_34px_-14px_rgba(14,26,18,0.18)] hover:ring-primary-bright"
          >
            <span className="grid size-[66px] place-items-center rounded-full bg-primary-light">
              <Icon className="size-[30px] text-primary" />
            </span>
            <h3 className="text-xl font-extrabold tracking-tight">{t(title)}</h3>
            <p className="text-sm text-muted-foreground">{t(`academic.${key}_desc`)}</p>
            <ul className="mt-auto grid gap-2.5 border-t border-border pt-4 text-sm font-medium">
              <CheckItem>{t(`academic.${key}_p1`)}</CheckItem>
              <CheckItem>{t(`academic.${key}_p2`)}</CheckItem>
            </ul>
          </LandingCard>
        ))}
      </div>
    </section>
  );
}

export default AcademicHub;

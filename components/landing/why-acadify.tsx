"use client";

import { DatabaseBackup, FileSpreadsheet, Headset, Languages, Smartphone, WifiOff } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { LandingCard, SectionHeader } from "@/components/landing/shared";

const REASONS = [
  { key: "bangla", icon: Languages },
  { key: "offline", icon: WifiOff },
  { key: "secure", icon: DatabaseBackup },
  { key: "payments", icon: Smartphone },
  { key: "migration", icon: FileSpreadsheet },
  { key: "support", icon: Headset },
] as const;

export function WhyAcadify() {
  const { t } = useLocale();

  return (
    <section id="why-acadify" className="mb-16 scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <SectionHeader tag={t("why.tag")} title={t("why.title")} description={t("why.description")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map(({ key, icon: Icon }) => (
          <LandingCard key={key} className="flex-row items-start rounded-[18px]">
            <span className="grid size-[54px] shrink-0 place-items-center rounded-full bg-primary-light">
              <Icon className="size-6 text-primary" />
            </span>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">{t(`why.${key}_title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`why.${key}_desc`)}</p>
            </div>
          </LandingCard>
        ))}
      </div>
    </section>
  );
}

export default WhyAcadify;

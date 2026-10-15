"use client";

import { BookOpen, BookOpenText, Building2, GraduationCap, Landmark, PencilLine, School } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { LandingCard } from "@/components/landing/shared";

const INSTITUTES = [
  { key: "strip.schools", icon: School },
  { key: "strip.colleges", icon: GraduationCap },
  { key: "strip.qawmi", icon: Landmark },
  { key: "strip.alia", icon: BookOpen },
  { key: "strip.hifz", icon: BookOpenText },
  { key: "strip.coaching", icon: PencilLine },
  { key: "strip.unified", icon: Building2 },
] as const;

export function InstitutesStrip() {
  const { t } = useLocale();

  return (
    <section id="institutes" aria-labelledby="strip-title" className="mb-[72px] scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <LandingCard raised className="block px-7 py-[22px]">
        <h2 id="strip-title" className="mb-4 text-center text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
          {t("strip.title")}
        </h2>
        <ul className="flex flex-wrap justify-around gap-x-7 gap-y-[18px]">
          {INSTITUTES.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-2 text-base font-extrabold tracking-tight opacity-80">
              <Icon className="size-[22px] text-primary" />
              {t(key)}
            </li>
          ))}
        </ul>
      </LandingCard>
    </section>
  );
}

export default InstitutesStrip;

"use client";

import { Headset, Languages, MessageSquareText, ShieldCheck, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { CARD_SHADOW, PillLink, SectionTag } from "@/components/landing/shared";
import { cn } from "@/lib/utils";

const BADGES = [
  { key: "hero.badge_automation", icon: Zap },
  { key: "hero.badge_language", icon: Languages },
  { key: "hero.badge_cloud", icon: ShieldCheck },
  { key: "hero.badge_support", icon: Headset },
] as const;

const SMS_BARS = [30, 45, 38, 60, 52, 78, 100];

function Dots({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute h-12 w-[74px] bg-[radial-gradient(var(--primary-bright)_1.6px,transparent_1.6px)] [background-size:12px_12px] opacity-55",
        className
      )}
    />
  );
}

function FloatCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("absolute block gap-0 rounded-[18px] p-2.5 py-2.5 ring-border sm:p-4 sm:py-4", CARD_SHADOW, className)}>
      {children}
    </Card>
  );
}

function Growth({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="rounded-full bg-primary-light px-2 text-[11.5px] font-bold text-primary">
      {children}
    </Badge>
  );
}

function GraduationCapArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" className={className} aria-hidden>
      <defs>
        <linearGradient id="hero-cap-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8EE06A" />
          <stop offset=".55" stopColor="#3DA23A" />
          <stop offset="1" stopColor="#1F6B22" />
        </linearGradient>
        <linearGradient id="hero-cap-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E8B2E" />
          <stop offset="1" stopColor="#17501A" />
        </linearGradient>
        <radialGradient id="hero-cap-tassel" cx=".4" cy=".3" r=".8">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset="1" stopColor="#E29A00" />
        </radialGradient>
      </defs>
      <path d="M52 92v40c0 18 30 30 58 30s58-12 58-30V92l-58 26z" fill="url(#hero-cap-base)" />
      <path d="M110 30 8 78l102 48 102-48z" fill="url(#hero-cap-top)" />
      <path d="M110 30 8 78l102 48 102-48z" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
      <ellipse cx="110" cy="78" rx="10" ry="5" fill="#17501A" />
      <path d="M110 78 186 92v44" stroke="url(#hero-cap-tassel)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M180 134h12l4 26h-20z" fill="url(#hero-cap-tassel)" />
    </svg>
  );
}

function HeroArt() {
  const { t } = useLocale();

  return (
    <div aria-hidden className="relative mx-auto aspect-[1.08] w-full max-w-[440px] lg:max-w-[480px] xl:max-w-[520px]">
      <div className="absolute inset-[4%_6%_6%_14%] rounded-full bg-[radial-gradient(circle_at_50%_45%,var(--primary-light)_0%,var(--primary-light)_55%,transparent_72%)]" />
      <Dots className="left-[30%] top-0" />
      <Dots className="right-[4%] top-[46%]" />
      <Dots className="bottom-[12%] left-[2%]" />

      {/* Fees monitor */}
      <FloatCard className="left-[22%] top-[8%] w-[48%] rounded-[20px] border-[4px] border-foreground/85 p-3 sm:border-[6px] sm:p-[18px]">
        <p className="truncate text-[11px] font-semibold text-muted-foreground sm:text-xs">{t("hero.card_fees")}</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-tight tabular-nums sm:text-[26px]">৳4,82,300</span>
          <Growth>+18.4%</Growth>
        </div>
        <svg viewBox="0 0 220 80" preserveAspectRatio="none" className="mt-2 h-14 w-full sm:h-20">
          <defs>
            <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--primary-bright)" stopOpacity=".35" />
              <stop offset="1" stopColor="var(--primary-bright)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 64 L30 56 L60 60 L90 42 L120 46 L150 30 L180 34 L220 12 L220 80 L0 80Z" fill="url(#hero-area)" />
          <path d="M0 64 L30 56 L60 60 L90 42 L120 46 L150 30 L180 34 L220 12" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" />
          <g fill="var(--card)" stroke="var(--primary)" strokeWidth="2">
            <circle cx="90" cy="42" r="3.5" />
            <circle cx="150" cy="30" r="3.5" />
            <circle cx="220" cy="12" r="3.5" />
          </g>
        </svg>
      </FloatCard>

      <GraduationCapArt className="animate-float absolute right-[2%] top-0 w-[46%] drop-shadow-[0_22px_26px_rgba(30,80,30,0.28)]" />

      {/* Attendance donut */}
      <FloatCard className="animate-float left-[4%] top-[38%] grid w-[30%] justify-items-center gap-2">
        <span className="justify-self-start text-[11px] font-bold sm:text-xs">{t("hero.card_attendance")}</span>
        <svg viewBox="0 0 100 100" className="w-[82%]">
          <circle cx="50" cy="50" r="38" fill="none" stroke="var(--primary-light)" strokeWidth="12" />
          <circle
            cx="50" cy="50" r="38" fill="none" stroke="var(--primary)" strokeWidth="12" strokeLinecap="round"
            strokeDasharray="219.8 238.8" transform="rotate(-90 50 50)"
          />
          <text x="50" y="57" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--foreground)">92%</text>
        </svg>
      </FloatCard>

      {/* SMS bars */}
      <FloatCard className="animate-float bottom-[6%] right-0 w-[36%] [animation-delay:0.8s] [animation-duration:7s]">
        <p className="text-[11px] font-semibold text-muted-foreground sm:text-xs">{t("hero.card_sms")}</p>
        <p className="text-lg font-extrabold tracking-tight tabular-nums sm:text-[26px]">1,248</p>
        <Growth>+35.4%</Growth>
        <div className="mt-2.5 flex h-12 items-end gap-[5px] sm:h-[70px]">
          {SMS_BARS.map((h, i) => (
            <i key={i} className="flex-1 rounded-t bg-gradient-to-b from-primary-bright to-primary" style={{ height: `${h}%` }} />
          ))}
        </div>
      </FloatCard>

      {/* Bangla SMS */}
      <FloatCard className="bottom-[4%] left-[18%] hidden w-[44%] gap-1.5 sm:grid">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <MessageSquareText className="size-3.5 text-primary" />
          {t("hero.card_sms_time")}
        </span>
        <p className="font-bengali text-[12.5px] leading-relaxed">{t("hero.card_sms_text")}</p>
      </FloatCard>
    </div>
  );
}

export function Hero() {
  const { t } = useLocale();

  return (
    <section id="top" className="mx-auto grid items-center gap-8 px-4 pt-6 pb-14 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:px-14">
      <div className="grid justify-items-start gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <SectionTag>{t("hero.tag")}</SectionTag>

        <h1 className="text-[2.4rem] font-extrabold leading-[1.06] tracking-[-0.035em] text-balance sm:text-5xl lg:text-[50px] xl:text-[60px]">
          {t("hero.title_lead")}{" "}
          <span className="relative inline-block text-primary">
            {t("hero.title_highlight")}
            <svg viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden className="absolute inset-x-0 -bottom-3.5 h-4 w-full text-primary-bright">
              <path d="M3 11C70 4 180 2 297 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        <p className="mt-2 max-w-[30em] text-base leading-relaxed text-muted-foreground sm:text-[16.5px]">
          {t("hero.description")}
        </p>

        <div className="flex w-full flex-wrap justify-center gap-3.5 sm:justify-start">
          <PillLink href="/contact">{t("hero.cta_primary")}</PillLink>
          <PillLink href="#modules" tone="outline">
            {t("hero.cta_secondary")}
          </PillLink>
        </div>

        <ul className="mt-1.5 flex flex-wrap gap-2.5">
          {BADGES.map(({ key, icon: Icon }) => (
            <li key={key}>
              <Badge
                variant="secondary"
                className="h-auto max-w-[11rem] gap-2.5 rounded-2xl px-3.5 py-2.5 text-[10.5px] leading-tight font-bold whitespace-normal text-foreground [&>svg]:size-4!"
              >
                <Icon className="shrink-0 text-primary" />
                {t(key)}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      <HeroArt />
    </section>
  );
}

export default Hero;

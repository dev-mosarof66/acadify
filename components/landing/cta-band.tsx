"use client";

import { CircleCheck } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { PillLink } from "@/components/landing/shared";

function ChecklistArt() {
  return (
    <svg viewBox="0 0 200 140" aria-hidden className="hidden w-[170px] drop-shadow-[0_14px_18px_rgba(0,0,0,0.3)] md:block">
      <defs>
        <linearGradient id="cta-clip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DCEFD3" />
        </linearGradient>
      </defs>
      <rect x="40" y="14" width="110" height="122" rx="12" fill="url(#cta-clip)" />
      <rect x="72" y="6" width="46" height="18" rx="6" fill="#1F5F1F" />
      <g stroke="#2E8B2E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="m58 50 6 6 12-12" />
        <path d="m58 80 6 6 12-12" />
        <path d="m58 110 6 6 12-12" />
      </g>
      <g fill="#B9DDAA">
        <rect x="88" y="46" width="48" height="8" rx="4" />
        <rect x="88" y="76" width="40" height="8" rx="4" />
        <rect x="88" y="106" width="44" height="8" rx="4" />
      </g>
      <circle cx="160" cy="104" r="26" fill="#F5B301" />
      <path d="M163 88 150 106h10l-3 14 13-18h-10z" fill="#fff" />
    </svg>
  );
}

/** `trialDays` comes from Platform Settings, so the offer always matches the real trial. */
export function CtaBand({ trialDays }: { trialDays: number }) {
  const { t, locale } = useLocale();
  const bnDigits = (n: number) => (locale === "bn" ? String(n).replace(/d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]) : String(n));

  return (
    <section id="get-started" className="mb-16 scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <div className="relative grid items-center gap-7 overflow-hidden rounded-[22px] bg-[linear-gradient(100deg,#1F5F1F_0%,#2C7A26_55%,#6DBE2E_100%)] px-6 py-7 text-center text-white md:grid-cols-[200px_1fr_auto] md:px-10 md:text-left">
        <span aria-hidden className="absolute top-3.5 left-3.5 size-10 bg-[radial-gradient(rgba(255,255,255,0.4)_1.5px,transparent_1.5px)] [background-size:9px_9px]" />
        <ChecklistArt />
        <div>
          <h2 className="text-[22px] font-extrabold tracking-tight text-balance sm:text-[28px]">{t("cta.title")}</h2>
          <p className="mt-2 text-sm opacity-85">{t("cta.description")}</p>
        </div>
        <div className="justify-self-center">
          <PillLink href="/contact" tone="white">
            {t("cta.button")}
          </PillLink>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12.5px] opacity-90">
            <CircleCheck className="size-[15px]" />
            {t("cta.note").replace("{days}", bnDigits(trialDays))}
          </p>
        </div>
      </div>
    </section>
  );
}

export default CtaBand;

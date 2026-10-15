"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Send } from "lucide-react";

import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";

const COLUMNS = [
  {
    title: "footer.quick_links",
    links: [
      { label: "footer.home", href: "/#top" },
      { label: "footer.features", href: "/#modules" },
      { label: "footer.institutions", href: "/#institutions" },
      { label: "nav.pricing", href: "/#pricing" },
      { label: "footer.faq", href: "/#faq" },
      { label: "footer.contact", href: "/contact" },
    ],
  },
  {
    title: "footer.modules",
    links: [
      { label: "modules.attendance_title", href: "/#one-click-sms" },
      { label: "modules.fees_title", href: "/#one-click-fee" },
      { label: "modules.exams_title", href: "/#one-click-tabulation" },
      { label: "modules.hifz_title", href: "/#madrasah" },
      { label: "modules.sheets_title", href: "/#lecture-sheets" },
    ],
  },
  {
    title: "footer.company",
    links: [
      { label: "footer.about_us", href: "/about" },
      { label: "footer.privacy", href: "/privacy" },
      { label: "footer.terms", href: "/terms" },
      { label: "footer.refund", href: "/refund" },
    ],
  },
] as const;

const SOCIALS = [
  { label: "Facebook", short: "f" },
  { label: "LinkedIn", short: "in" },
  { label: "YouTube", short: "▶" },
];

export function SiteFooter() {
  const { t } = useLocale();
  const [subscribed, setSubscribed] = React.useState(false);

  return (
    <footer id="contact" className="scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <div className="grid grid-cols-2 gap-8 border-t border-border pt-9 pb-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.6fr]">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight">
            <Image src={logoImg} alt="" width={34} height={34} className="size-[34px] object-contain" />
            {t("app.title")}
          </Link>
          <p className="mt-3.5 mb-[18px] max-w-[24em] text-[13px] text-muted-foreground">{t("footer.about")}</p>
          <div className="flex gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="grid size-8 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground"
              >
                {s.short}
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3.5 text-sm font-extrabold">{t(col.title)}</h3>
            <ul className="grid gap-2 text-[13px] text-muted-foreground">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-primary">
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="col-span-2 lg:col-span-1">
          <h3 className="mb-3.5 text-sm font-extrabold">{t("footer.newsletter")}</h3>
          <p className="mb-3.5 text-[13px] text-muted-foreground">{t("footer.newsletter_desc")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubscribed(true);
              e.currentTarget.reset();
            }}
            className="flex overflow-hidden rounded-xl border border-border bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
          >
            <Input
              id="newsletter-email"
              type="email"
              required
              placeholder={t("footer.email_placeholder")}
              aria-label={t("footer.email_placeholder")}
              className="h-11 flex-1 rounded-none border-0 bg-transparent px-3.5 text-[13px] focus-visible:ring-0 dark:bg-transparent md:text-[13px]"
            />
            <Button type="submit" size="icon" aria-label={t("footer.subscribe")} className="h-11 w-12 rounded-none">
              <Send className="size-[18px]" />
            </Button>
          </form>
          {subscribed && <p className="mt-2 text-[12.5px] font-semibold text-primary">{t("footer.subscribed")}</p>}
        </div>
      </div>

      <p className="border-t border-border pt-4 pb-6 text-center text-[12.5px] text-muted-foreground">
        © 2026 {t("app.title")}. {t("footer.rights")}
      </p>
    </footer>
  );
}

export default SiteFooter;

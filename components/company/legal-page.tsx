"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Copy, FileText, Mail, RotateCcw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { PageHero } from "@/components/company/page-hero";
import { CheckItem, FEATURED_GRADIENT, LandingCard } from "@/components/landing/shared";
import { companyContent, type LegalKey } from "@/lib/content/company";
import { cn } from "@/lib/utils";

const POLICIES: { key: LegalKey; href: string; label: string; icon: React.ElementType }[] = [
  { key: "privacy", href: "/privacy", label: "footer.privacy", icon: ShieldCheck },
  { key: "terms", href: "/terms", label: "footer.terms", icon: FileText },
  { key: "refund", href: "/refund", label: "footer.refund", icon: RotateCcw },
];

/** Highlights the section currently in view in the table of contents. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = React.useState(ids[0]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 gap-1.5 rounded-full border-white/30 bg-white/10 px-3.5 text-white hover:bg-white/20 hover:text-white dark:border-white/30 dark:bg-white/10"
      onClick={() => {
        navigator.clipboard?.writeText(email).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          },
          () => setCopied(false)
        );
      }}
    >
      <Copy className="size-3.5" />
      {copied ? "✓" : email}
    </Button>
  );
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Legal text with values from Platform Settings filled in ("{trialDays}-day free trial"). */
export function LegalPage({ doc: docKey, supportEmail, trialDays }: { doc: LegalKey; supportEmail: string; trialDays: number }) {
  const { t, locale } = useLocale();
  const days = locale === "bn" ? String(trialDays).replace(/d/g, (d) => BN_DIGITS[Number(d)]) : String(trialDays);
  const fill = (text: string) => text.replaceAll("{trialDays}", days);
  const doc = companyContent[docKey][locale];
  const ui = companyContent.ui[locale];
  const ids = React.useMemo(() => doc.sections.map((s) => s.id), [doc]);
  const active = useActiveSection(ids);

  return (
    <>
      <PageHero homeLabel={t("footer.home")} tag={doc.tag} title={doc.title} description={doc.intro}>
        <Badge variant="outline" className="mt-2 h-auto gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[12.5px] font-semibold [&>svg]:size-3.5!">
          <CalendarDays className="text-primary" />
          {ui.lastUpdated}: {ui.updatedDate}
        </Badge>
      </PageHero>

      <section className="grid gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:px-14">
        {/* Table of contents */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <LandingCard className="gap-1 rounded-[18px] p-4 py-4">
            <p className="px-3 pb-2 text-[11.5px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">{ui.onThisPage}</p>
            <nav className="grid gap-0.5">
              {doc.sections.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    active === s.id ? "bg-primary-light text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span className="w-5 text-xs tabular-nums opacity-70">{String(i + 1).padStart(2, "0")}</span>
                  {fill(s.title)}
                </a>
              ))}
            </nav>
          </LandingCard>

          <div className="mt-4 hidden gap-2 lg:grid">
            {POLICIES.filter((p) => p.key !== docKey).map(({ key, href, label, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary"
              >
                <Icon className="size-4 text-primary" />
                {t(label)}
              </Link>
            ))}
          </div>
        </aside>

        {/* Policy text */}
        <div className="grid min-w-0 gap-4">
          {doc.sections.map((s, i) => (
            <LandingCard key={s.id} id={s.id} className="scroll-mt-24 gap-3 rounded-[20px] p-6 py-6 sm:p-8 sm:py-8">
              <h2 className="flex items-center gap-3 text-xl font-extrabold tracking-tight">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-extrabold text-primary tabular-nums">
                  {i + 1}
                </span>
                {fill(s.title)}
              </h2>
              {s.body.map((p, j) => (
                <p key={j} className="max-w-[68ch] leading-relaxed text-muted-foreground">
                  {fill(p)}
                </p>
              ))}
              {s.list && (
                <ul className="mt-1 grid gap-2.5 font-medium">
                  {s.list.map((item) => (
                    <CheckItem key={item}>{fill(item)}</CheckItem>
                  ))}
                </ul>
              )}
            </LandingCard>
          ))}

          <LandingCard className={cn("mt-4 gap-3 rounded-[22px] p-7 py-7 sm:flex-row sm:items-center sm:justify-between", FEATURED_GRADIENT)}>
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15">
                <Mail className="size-6" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">{ui.questionsTitle}</h2>
                <p className="mt-1 text-sm text-white/80">{ui.questionsDesc}</p>
              </div>
            </div>
            <CopyEmail email={supportEmail} />
          </LandingCard>
        </div>
      </section>
    </>
  );
}

export default LegalPage;

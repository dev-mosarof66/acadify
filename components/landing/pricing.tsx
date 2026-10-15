"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocale } from "@/components/providers/locale-provider";
import { CheckItem, FEATURED_GRADIENT, LandingCard, PillLink, SectionHeader } from "@/components/landing/shared";
import type { Plan } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

/** Literal classes so Tailwind generates them: one column per plan, up to four. */
const COLUMNS: Record<number, string> = { 1: "md:grid-cols-1 md:max-w-md md:mx-auto", 2: "md:grid-cols-2 md:max-w-4xl md:mx-auto", 3: "md:grid-cols-3", 4: "md:grid-cols-2 xl:grid-cols-4" };

/** Percentage saved by paying yearly instead of 12 monthly payments. */
const yearlySaving = (p: Plan) => (p.price && p.yearlyPrice ? Math.round((1 - p.yearlyPrice / (p.price * 12)) * 100) : 0);

/** Pricing cards; plans and their wording come from the database (managed on /admin/plans). */
export function Pricing({ plans }: { plans: Plan[] }) {
  const { t, locale } = useLocale();
  const bn = locale === "bn";
  const [billing, setBilling] = React.useState<Billing>("monthly");
  const bestSaving = Math.max(0, ...plans.map(yearlySaving));
  const offersYearly = bestSaving > 0;
  const yearly = offersYearly && billing === "yearly";

  const number = (n: number) => new Intl.NumberFormat(bn ? "bn-BD" : "en-US").format(n);
  /** Shown per month; on yearly billing, the yearly price spread over 12 months (rounded to ৳10). */
  const monthlyShown = (p: Plan) => (yearly && p.yearlyPrice ? Math.round(p.yearlyPrice / 12 / 10) * 10 : (p.price ?? 0));

  if (!plans.length) return null;

  return (
    <section id="pricing" className="mb-20 scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <SectionHeader tag={t("pricing.tag")} title={t("pricing.title")} description={t("pricing.description")} className="mb-7" />

      {offersYearly && (
        <div className="mb-9 flex justify-center">
          <ToggleGroup
            aria-label={t("pricing.tag")}
            value={[billing]}
            onValueChange={(values) => {
              const next = values[0] as Billing | undefined;
              if (next) setBilling(next);
            }}
            spacing={1}
            className="rounded-full border border-border bg-card p-1"
          >
            {(["monthly", "yearly"] as const).map((value) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="h-10 cursor-pointer gap-2 rounded-full px-5 text-sm font-bold text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {t(`pricing.${value}`)}
                {value === "yearly" && (
                  <Badge
                    variant="secondary"
                    className={cn("rounded-full px-2 text-[11px] font-bold", yearly ? "bg-white/20 text-white" : "bg-primary-light text-primary")}
                  >
                    {t("pricing.yearly_save").replace("{n}", number(bestSaving))}
                  </Badge>
                )}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      <div className={cn("grid items-stretch gap-4", COLUMNS[Math.min(plans.length, 4)])}>
        {plans.map((plan) => {
          const name = (bn && plan.nameBn) || plan.name;
          const tagline = (bn && plan.taglineBn) || plan.tagline;
          const features = bn && plan.featuresBn.length ? plan.featuresBn : plan.features;
          const custom = plan.price === null;
          return (
            <LandingCard key={plan.key} className={cn("relative gap-5 rounded-[22px] p-7 py-7", plan.featured && FEATURED_GRADIENT)}>
              {plan.featured && (
                <Badge className="absolute top-6 right-6 h-auto rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
                  {t("pricing.popular")}
                </Badge>
              )}
              <div>
                <h3 className="text-xl font-extrabold">{name}</h3>
                {tagline && <p className={cn("mt-1 text-sm", plan.featured ? "text-white/80" : "text-muted-foreground")}>{tagline}</p>}
              </div>
              <div>
                <p className="flex items-baseline gap-1.5">
                  {custom ? (
                    <span className="text-[40px] leading-none font-extrabold tracking-tight">{t("pricing.custom")}</span>
                  ) : (
                    <>
                      <span className="text-[40px] leading-none font-extrabold tracking-tight tabular-nums">৳{number(monthlyShown(plan))}</span>
                      <span className={cn("text-sm", plan.featured ? "text-white/80" : "text-muted-foreground")}>{t("pricing.per_month")}</span>
                    </>
                  )}
                </p>
                {yearly && !custom && (
                  <p className={cn("mt-1.5 text-[13px]", plan.featured ? "text-white/80" : "text-muted-foreground")}>
                    {plan.yearlyPrice ? t("pricing.billed_yearly").replace("{amount}", `৳${number(plan.yearlyPrice)}`) : t("pricing.monthly_only")}
                  </p>
                )}
              </div>
              <ul className={cn("grid flex-1 content-start gap-2.5 text-sm font-medium", plan.featured && "[&_svg]:text-white")}>
                {features.map((f) => (
                  <CheckItem key={f}>{f}</CheckItem>
                ))}
              </ul>
              <PillLink href="/contact" tone={plan.featured ? "white" : "outline"} className="justify-between">
                {t(custom ? "pricing.contact" : "pricing.start")}
              </PillLink>
            </LandingCard>
          );
        })}
      </div>
    </section>
  );
}

export default Pricing;

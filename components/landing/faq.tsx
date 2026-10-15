"use client";

import { MessageCircleQuestion } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLocale } from "@/components/providers/locale-provider";
import { FEATURED_GRADIENT, LandingCard, PillLink, SectionTag } from "@/components/landing/shared";
import type { Faq as FaqItem } from "@/lib/faqs/queries";
import { cn } from "@/lib/utils";

/** FAQs come from the database (managed on /admin/faqs); Bangla falls back to English when not written. */
export function Faq({ faqs }: { faqs: FaqItem[] }) {
  const { t, locale } = useLocale();
  const bn = locale === "bn";
  if (!faqs.length) return null;

  return (
    <section id="faq" className="mb-16 scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-14">
        <div className="grid content-start justify-items-start gap-4 text-left">
          <SectionTag>{t("faq.tag")}</SectionTag>
          <h2 className="text-[26px] font-extrabold tracking-tight text-balance sm:text-4xl">{t("faq.title")}</h2>
          <p className="max-w-[30em] text-muted-foreground">{t("faq.description")}</p>

          <LandingCard className={cn("mt-4 w-full max-w-md gap-3 p-7 py-7", FEATURED_GRADIENT)}>
            <span className="grid size-12 place-items-center rounded-full bg-white/15">
              <MessageCircleQuestion className="size-6" />
            </span>
            <h3 className="text-xl font-extrabold">{t("faq.contact_title")}</h3>
            <p className="text-sm text-white/80">{t("faq.contact_desc")}</p>
            <PillLink href="/contact" tone="white" className="mt-2 w-fit">
              {t("faq.contact_cta")}
            </PillLink>
          </LandingCard>
        </div>

        <Accordion defaultValue={[faqs[0].id]} className="gap-3">
          {faqs.map((f) => (
            <AccordionItem
              key={f.id}
              value={f.id}
              className="rounded-[18px] border border-border bg-card px-5 transition-colors not-last:border-b data-open:border-primary-bright data-open:bg-secondary sm:px-6"
            >
              <AccordionTrigger className="gap-4 py-5 text-[15.5px] font-bold hover:no-underline **:data-[slot=accordion-trigger-icon]:size-5 **:data-[slot=accordion-trigger-icon]:text-primary">
                {(bn && f.questionBn) || f.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-[14.5px] leading-relaxed text-muted-foreground">
                {(bn && f.answerBn) || f.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export default Faq;

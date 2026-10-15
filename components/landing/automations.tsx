"use client";

import { Award, CalendarDays, CircleCheck, MessageSquareText, Wallet, Zap } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { ArrowLink, CheckItem, LandingCard, SectionHeader } from "@/components/landing/shared";
import { cn } from "@/lib/utils";

function CardHeader({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2.5 text-sm font-bold">
        <span className="grid size-9 place-items-center rounded-full bg-primary-light">
          <Icon className="size-[18px] text-primary" />
        </span>
        {title}
      </span>
      {badge}
    </div>
  );
}

function Pill({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-2.5 text-[11.5px] font-bold",
        tone === "green" ? "bg-primary-light text-primary" : "bg-accent-light text-accent-foreground dark:text-accent"
      )}
    >
      {children}
    </Badge>
  );
}

function SmsVisual() {
  const { t } = useLocale();
  const rows = [
    { name: "Rafi Ahmed", meta: "Roll 12", sent: true },
    { name: "Nusrat Jahan", meta: "Roll 18", sent: true },
    { name: "Tanvir Hasan", meta: "Roll 23", sent: false },
    { name: "Sadia Akter", meta: "Roll 31", sent: true },
  ];
  return (
    <LandingCard raised className="block p-5 py-5 sm:p-6 sm:py-6">
      <CardHeader icon={MessageSquareText} title={t("automations.sms_card")} />
      <ul className="grid gap-2">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3.5 py-2.5 text-sm">
            <span>
              <b className="font-bold">{r.name}</b>
              <span className="ml-2 text-xs text-muted-foreground">{r.meta}</span>
            </span>
            <Pill tone={r.sent ? "green" : "amber"}>{r.sent ? t("automations.sms_sent") : t("automations.sms_skipped")}</Pill>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground">
        <Zap className="size-4 fill-current" />
        {t("automations.sms_button")}
      </div>
    </LandingCard>
  );
}

function FeeVisual() {
  const { t } = useLocale();
  const rows = [
    { label: t("automations.fee_tuition"), value: "৳1,200" },
    { label: t("automations.fee_transport"), value: "৳600" },
    { label: t("automations.fee_waiver"), value: "−৳600", green: true },
  ];
  return (
    <LandingCard raised className="block p-5 py-5 sm:p-6 sm:py-6">
      <CardHeader icon={Wallet} title={t("automations.fee_card")} badge={<Pill>INV-2026-11-0832</Pill>} />
      <dl className="grid gap-2.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className={cn("font-bold tabular-nums", r.green && "text-primary")}>{r.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-dashed border-border pt-3 text-base">
          <dt className="font-bold">{t("automations.fee_total")}</dt>
          <dd className="font-extrabold tabular-nums">৳1,200</dd>
        </div>
      </dl>
      <p className="mt-4 flex items-center gap-2 rounded-xl bg-primary-light px-3.5 py-2.5 text-[13px] font-semibold text-primary">
        <CircleCheck className="size-4" />
        {t("automations.fee_generated")}
      </p>
    </LandingCard>
  );
}

function RoutineVisual() {
  const { t } = useLocale();
  const periods = ["Bangla", "English", "Math", "Physics", "Chemistry", "Biology"];
  const teachers = ["Mr. Karim", "Ms. Rina", "Mr. Alam", "Ms. Lipi", "Mr. Habib", "Ms. Tania"];
  return (
    <LandingCard raised className="block p-5 py-5 sm:p-6 sm:py-6">
      <CardHeader icon={CalendarDays} title={t("automations.routine_card")} badge={<Pill>{t("automations.routine_clashes")}</Pill>} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {periods.map((subject, i) => {
          const isSub = i === 3;
          return (
            <div
              key={subject}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                isSub ? "border-accent bg-accent-light" : "border-border bg-secondary"
              )}
            >
              <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">P{i + 1} · {8 + i}:00</p>
              <p className="text-sm font-bold">{subject}</p>
              <p className={cn("text-xs", isSub ? "font-semibold text-accent-foreground dark:text-accent" : "text-muted-foreground")}>
                {isSub ? `${t("automations.routine_sub")}: Mr. Kabir` : teachers[i]}
              </p>
            </div>
          );
        })}
      </div>
    </LandingCard>
  );
}

function TabulationVisual() {
  const { t } = useLocale();
  const rows = [
    { name: "Nusrat Jahan", total: 1142, gpa: "5.00", pos: 1 },
    { name: "Arif Hossain", total: 1098, gpa: "5.00", pos: 2 },
    { name: "Mitu Rani", total: 1051, gpa: "4.89", pos: 3 },
    { name: "Tanvir Hasan", total: 987, gpa: "4.61", pos: 4 },
  ];
  return (
    <LandingCard raised className="block p-5 py-5 sm:p-6 sm:py-6">
      <CardHeader icon={Award} title={t("automations.tabulation_card")} />
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[300px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3.5 py-2.5 font-bold">{t("automations.tab_student")}</th>
              <th className="px-3.5 py-2.5 text-right font-bold">{t("automations.tab_total")}</th>
              <th className="px-3.5 py-2.5 text-right font-bold">{t("automations.tab_gpa")}</th>
              <th className="px-3.5 py-2.5 text-right font-bold">{t("automations.tab_pos")}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-border">
                <td className="px-3.5 py-2.5 font-semibold">{r.name}</td>
                <td className="px-3.5 py-2.5 text-right">{r.total}</td>
                <td className="px-3.5 py-2.5 text-right font-extrabold text-primary">{r.gpa}</td>
                <td className="px-3.5 py-2.5 text-right">{r.pos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LandingCard>
  );
}

const ROWS = [
  { id: "one-click-sms", key: "sms", title: "action.one_click_sms", Visual: SmsVisual },
  { id: "one-click-fee", key: "fee", title: "action.one_click_fee", Visual: FeeVisual },
  { id: "one-click-routine", key: "routine", title: "action.one_click_routine", Visual: RoutineVisual },
  { id: "one-click-tabulation", key: "tabulation", title: "action.one_click_tabulation", Visual: TabulationVisual },
] as const;

export function Automations() {
  const { t } = useLocale();

  return (
    <section id="features" className="mb-20 scroll-mt-24 px-4 sm:px-6 lg:px-14">
      <SectionHeader tag={t("automations.tag")} title={t("automations.title")} description={t("automations.description")} />

      <div className="grid gap-16 lg:gap-20">
        {ROWS.map(({ id, key, title, Visual }, i) => (
          <article id={id} key={id} className="grid scroll-mt-28 items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div className={cn("grid justify-items-start gap-4", i % 2 === 1 && "lg:order-2")}>
              <span className="flex items-center gap-2 text-sm font-bold text-primary">
                <span className="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">{i + 1}</span>
                {t("automations.tag")}
              </span>
              <h3 className="text-2xl font-extrabold tracking-tight text-balance sm:text-[30px]">{t(title)}</h3>
              <p className="max-w-[34em] text-muted-foreground">{t(`automations.${key}_desc`)}</p>
              <ul className="grid gap-2.5 text-[15px] font-medium">
                {[1, 2, 3].map((n) => (
                  <CheckItem key={n}>{t(`automations.${key}_p${n}`)}</CheckItem>
                ))}
              </ul>
              <ArrowLink href="/contact" className="mt-1">
                {t("automations.cta")}
              </ArrowLink>
            </div>
            <div className="relative">
              <div aria-hidden className="absolute inset-[8%] -z-10 rounded-full bg-primary-light blur-2xl" />
              <Visual />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Automations;

"use client";

import * as React from "react";
import { CircleCheck, Clock, Loader2, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/providers/locale-provider";
import { PageHero } from "@/components/company/page-hero";
import { ArrowDot, FEATURED_GRADIENT, LandingCard, SectionTag } from "@/components/landing/shared";
import { contactContent, type ContactContent } from "@/lib/content/company";
import { telHref, whatsappHref, type PlatformSettings } from "@/lib/settings/types";
import { submitDemoRequest } from "@/lib/actions/demo-request";
import { cn } from "@/lib/utils";

/** Literal classes so Tailwind generates them: fill the row however many cards there are. */
const METHOD_COLUMNS: Record<number, string> = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-4" };

const METHOD_ICONS = { phone: Phone, whatsapp: MessageCircle, email: Mail, office: MapPin } as const;

export type ContactDetails = Pick<PlatformSettings, "phone" | "whatsapp" | "supportEmail" | "salesEmail" | "office" | "officeBn">;

/** Value and link for each contact card, from Platform Settings; cards with no value are hidden. */
function methodDetails(key: keyof typeof METHOD_ICONS, d: ContactDetails, bn: boolean) {
  switch (key) {
    case "phone":
      return { value: d.phone, href: telHref(d.phone) };
    case "whatsapp":
      return { value: d.whatsapp, href: whatsappHref(d.whatsapp) };
    case "email":
      return { value: d.supportEmail, href: `mailto:${d.supportEmail}` };
    case "office":
      return { value: (bn && d.officeBn) || d.office, href: "#demo-form" };
  }
}

type FieldName = "name" | "institute" | "type" | "phone" | "email" | "students" | "message";
type Errors = Partial<Record<FieldName, string>>;

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
/** Converts Bangla digits to ASCII and strips spaces/dashes so "০১৭১২-৩৪৫৬৭৮" validates. */
function normalizePhone(value: string) {
  return value.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d))).replace(/[\s-]/g, "");
}
const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(data: FormData, c: ContactContent): Errors {
  const errors: Errors = {};
  const get = (k: FieldName) => String(data.get(k) ?? "").trim();
  (["name", "institute", "type", "phone", "email"] as const).forEach((k) => {
    if (!get(k)) errors[k] = c.errors.required;
  });
  if (get("phone") && !BD_MOBILE.test(normalizePhone(get("phone")))) errors.phone = c.errors.phone;
  if (get("email") && !EMAIL.test(get("email"))) errors.email = c.errors.email;
  return errors;
}

function Field({
  id,
  label,
  optional,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="gap-1 text-[13.5px] font-bold">
        {label}
        {optional ? (
          <span className="font-medium text-muted-foreground">({optional})</span>
        ) : (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[12.5px] font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL = "h-11 rounded-xl bg-card px-4 text-[14.5px] md:text-[14.5px] dark:bg-card";

function DemoForm({ c }: { c: ContactContent }) {
  const [errors, setErrors] = React.useState<Errors>({});
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent">("idle");
  const [sendError, setSendError] = React.useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const found = validate(data, c);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      e.currentTarget.querySelector<HTMLElement>(`[name="${first}"], #contact-${first}`)?.focus();
      return;
    }
    setStatus("sending");
    setSendError(false);
    try {
      const result = await submitDemoRequest(data);
      if (result.ok) {
        setStatus("sent");
        return;
      }
      // Server rejected a field the browser accepted: show the same messages
      const serverErrors: Errors = {};
      result.fields?.forEach((k) => (serverErrors[k as FieldName] = k === "phone" ? c.errors.phone : k === "email" ? c.errors.email : c.errors.required));
      setErrors(serverErrors);
    } catch {
      setSendError(true);
    }
    setStatus("idle");
  };

  if (status === "sent") {
    return (
      <div className="grid min-h-[420px] place-items-center text-center" role="status">
        <div className="grid justify-items-center gap-3">
          <span className="grid size-[72px] place-items-center rounded-full bg-primary-light">
            <CircleCheck className="size-9 text-primary" />
          </span>
          <h3 className="text-2xl font-extrabold">{c.successTitle}</h3>
          <p className="max-w-sm text-muted-foreground">{c.successDesc}</p>
          <Button
            variant="outline"
            className="mt-2 h-11 rounded-full border-primary px-5 font-bold text-primary hover:bg-primary-light hover:text-primary"
            onClick={() => {
              setStatus("idle");
              setErrors({});
            }}
          >
            {c.successAgain}
          </Button>
        </div>
      </div>
    );
  }

  const f = c.fields;
  const errProps = (k: FieldName) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `contact-${k}-error` : undefined,
  });

  return (
    <form method="post" noValidate onSubmit={onSubmit} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      {sendError && (
        <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive sm:col-span-2">
          {c.sendError}
        </p>
      )}
      {/* Honeypot for bots: hidden from people and screen readers */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
      <Field id="contact-name" label={f.name} error={errors.name}>
        <Input id="contact-name" name="name" autoComplete="name" placeholder={f.namePlaceholder} className={CONTROL} {...errProps("name")} />
      </Field>
      <Field id="contact-institute" label={f.institute} error={errors.institute}>
        <Input
          id="contact-institute"
          name="institute"
          autoComplete="organization"
          placeholder={f.institutePlaceholder}
          className={CONTROL}
          {...errProps("institute")}
        />
      </Field>
      <Field id="contact-type" label={f.type} error={errors.type}>
        <Select name="type" items={c.types}>
          <SelectTrigger id="contact-type" className={cn(CONTROL, "w-full")} {...errProps("type")}>
            <SelectValue placeholder={f.typePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {c.types.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id="contact-students" label={f.students} optional={f.optional}>
        <Select name="students" items={c.studentRanges}>
          <SelectTrigger id="contact-students" className={cn(CONTROL, "w-full")}>
            <SelectValue placeholder={f.studentsPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {c.studentRanges.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id="contact-phone" label={f.phone} error={errors.phone}>
        <Input
          id="contact-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={f.phonePlaceholder}
          className={CONTROL}
          {...errProps("phone")}
        />
      </Field>
      <Field id="contact-email" label={f.email} error={errors.email}>
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={f.emailPlaceholder}
          className={CONTROL}
          {...errProps("email")}
        />
      </Field>
      <Field id="contact-message" label={f.message} optional={f.optional} className="sm:col-span-2">
        <Textarea
          id="contact-message"
          name="message"
          rows={3}
          placeholder={f.messagePlaceholder}
          className="min-h-20 rounded-xl bg-card px-4 py-3 text-[14.5px] md:text-[14.5px] dark:bg-card"
        />
      </Field>

      <div className="flex flex-col items-start gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-muted-foreground">{c.privacyNote}</p>
        <Button
          type="submit"
          disabled={status === "sending"}
          className="h-[50px] gap-3 rounded-full pr-2 pl-[22px] text-[14.5px] font-bold shadow-[0_10px_22px_-10px_var(--primary)] hover:bg-primary-hover"
        >
          {status === "sending" ? c.sending : c.submit}
          <span className="grid size-[34px] place-items-center rounded-full bg-primary-foreground text-primary">
            {status === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </span>
        </Button>
      </div>
    </form>
  );
}

export function ContactPage({ contact }: { contact: ContactDetails }) {
  const { t, locale } = useLocale();
  const c = contactContent[locale];
  const methods = c.methods.map((m) => ({ ...m, ...methodDetails(m.key, contact, locale === "bn") })).filter((m) => m.value && m.href);

  return (
    <>
      <PageHero homeLabel={t("footer.home")} tag={c.tag} title={c.title} highlight={c.highlight} description={c.description} />

      {/* Contact methods */}
      <section className={cn("grid gap-4 px-4 pt-14 sm:grid-cols-2 sm:px-6 lg:px-14", METHOD_COLUMNS[methods.length])}>
        {methods.map((m) => {
          const Icon = METHOD_ICONS[m.key];
          const href = m.href;
          const external = href.startsWith("http");
          return (
            <LandingCard
              key={m.key}
              className="rounded-[20px] p-6 py-6 transition-all hover:-translate-y-[3px] hover:shadow-[0_14px_34px_-14px_rgba(14,26,18,0.18)] hover:ring-primary-bright"
            >
              <span className="grid size-[58px] place-items-center rounded-full bg-primary-light">
                <Icon className="size-[26px] text-primary" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">{m.title}</h2>
                <p className="mt-1 font-semibold break-all select-all">{m.value}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{m.hint}</p>
              </div>
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="mt-auto flex items-center justify-between border-t border-border pt-4 text-sm font-bold text-primary"
              >
                {m.action}
                <ArrowDot className="size-6 bg-primary text-primary-foreground" iconClassName="size-[13px]" />
              </a>
            </LandingCard>
          );
        })}
      </section>

      {/* Form + hours */}
      <section id="demo-form" className="grid scroll-mt-4 gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:px-14">
        <LandingCard raised className="gap-5 rounded-[24px] p-6 py-6 sm:p-7 sm:py-7">
          <div className="grid justify-items-start gap-2">
            <SectionTag>{c.formTag}</SectionTag>
            <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[30px]">{c.formTitle}</h2>
            <p className="max-w-[46ch] text-muted-foreground">{c.formDescription}</p>
          </div>
          <DemoForm key={locale} c={c} />
        </LandingCard>

        <div className="grid content-start gap-4">
          <LandingCard className={cn("rounded-[24px] p-7 py-7", FEATURED_GRADIENT)}>
            <span className="grid size-[54px] place-items-center rounded-full bg-white/15">
              <Clock className="size-6" />
            </span>
            <h2 className="text-xl font-extrabold">{c.hoursTitle}</h2>
            <dl className="grid gap-3">
              {c.hours.map((h) => (
                <div key={h.day} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-white/15 pb-3 last:border-0 last:pb-0">
                  <dt className="text-sm text-white/80">{h.day}</dt>
                  <dd className="font-bold">{h.time}</dd>
                </div>
              ))}
            </dl>
          </LandingCard>

          <LandingCard className="rounded-[24px] p-7 py-7">
            <span className="grid size-[54px] place-items-center rounded-full bg-primary-light">
              <Mail className="size-6 text-primary" />
            </span>
            <h2 className="text-lg font-extrabold">{t("nav.pricing")}</h2>
            <p className="font-semibold break-all select-all">{contact.salesEmail}</p>
          </LandingCard>
        </div>
      </section>
    </>
  );
}

export default ContactPage;

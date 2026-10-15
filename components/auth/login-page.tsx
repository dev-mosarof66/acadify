"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleAlert, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/providers/locale-provider";
import { SectionTag } from "@/components/landing/shared";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginIllustration } from "@/components/auth/illustrations";
import { PhoneLoginForm } from "@/components/auth/phone-login-form";
import { signInAction, type AuthErrorCode } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

type FieldName = "email" | "password";
type Errors = Partial<Record<FieldName, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL = "h-11 rounded-xl bg-card px-4 text-[14.5px] md:text-[14.5px] dark:bg-card";

/** Server error code (or ?error= from a redirect) -> translation key. */
const ERROR_KEYS: Partial<Record<AuthErrorCode, string>> = {
  invalid: "login.error_invalid",
  banned: "login.error_banned",
  unverified: "login.error_unverified",
  rate: "login.error_rate",
  network: "login.error_network",
  forbidden: "login.error_forbidden",
  "no-institute": "login.error_no_institute",
  unknown: "login.error_unknown",
};

function LoginForm() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const fromRedirect = searchParams.get("error") as AuthErrorCode | null;

  const [values, setValues] = React.useState<Record<FieldName, string>>({ email: "", password: "" });
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<AuthErrorCode | null>(fromRedirect && ERROR_KEYS[fromRedirect] ? fromRedirect : null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [pending, startTransition] = React.useTransition();

  const update = (name: FieldName) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
    setFormError(null);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found: Errors = {};
    if (!values.email.trim()) found.email = t("login.error_required");
    else if (!EMAIL.test(values.email.trim())) found.email = t("login.error_identifier");
    if (!values.password) found.password = t("login.error_password");
    setErrors(found);
    const first = (Object.keys(found) as FieldName[])[0];
    if (first) {
      document.getElementById(`login-${first}`)?.focus();
      return;
    }

    const form = new FormData();
    form.set("email", values.email.trim());
    form.set("password", values.password);
    form.set("remember", String(remember));
    startTransition(async () => {
      // On success the action redirects (admins to the emailed-code step, others to /dashboard)
      const result = await signInAction(form);
      if (!result.ok) {
        setFormError(result.code);
        setValues((v) => ({ ...v, password: "" }));
        document.getElementById("login-password")?.focus();
      }
    });
  };

  const errProps = (k: FieldName) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `login-${k}-error` : undefined,
  });

  const errorText = (k: FieldName) =>
    errors[k] ? (
      <p id={`login-${k}-error`} className="text-[12.5px] font-semibold text-destructive">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form method="post" noValidate onSubmit={onSubmit} className="grid gap-4">
      {formError && (
        <div role="alert" className="flex gap-3 rounded-xl border border-destructive/30 bg-danger-light p-4 text-sm font-medium">
          <CircleAlert className="mt-0.5 size-[18px] shrink-0 text-destructive" />
          <p>{t(ERROR_KEYS[formError] ?? "login.error_unknown")}</p>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="login-email" className="text-[13.5px] font-bold">
          {t("login.identifier")}
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t("login.identifier_placeholder")}
            value={values.email}
            onChange={update("email")}
            className={cn(CONTROL, "pl-11")}
            {...errProps("email")}
          />
        </div>
        {errorText("email")}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="login-password" className="text-[13.5px] font-bold">
            {t("login.password")}
          </Label>
          <Link href="/forgot-password" className="text-[13px] font-bold text-primary hover:underline">
            {t("login.forgot")}
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("login.password_placeholder")}
            value={values.password}
            onChange={update("password")}
            className={cn(CONTROL, "pr-12 pl-11")}
            {...errProps("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? t("login.hide_password") : t("login.show_password")}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-1.5 size-9 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-primary"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        {errorText("password")}
      </div>

      <Label htmlFor="login-remember" className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-medium">
        <Checkbox
          id="login-remember"
          checked={remember}
          onCheckedChange={(v) => setRemember(Boolean(v))}
          className="size-[18px] rounded-[5px] data-checked:border-primary data-checked:bg-primary"
        />
        {t("login.remember")}
      </Label>

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full justify-between rounded-full pr-2 pl-6 text-[15px] font-bold shadow-[0_10px_22px_-10px_var(--primary)] hover:bg-primary-hover"
      >
        {pending ? t("login.signing_in") : t("login.submit")}
        <span className="grid size-9 place-items-center rounded-full bg-primary-foreground text-primary">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" strokeWidth={2.4} />}
        </span>
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" />
        {t("login.secure")}
      </p>
    </form>
  );
}

/** Email and password, or a code sent to a mobile number. */
function SignInMethods() {
  const { t } = useLocale();
  const [method, setMethod] = React.useState<"email" | "phone">("email");
  const tabs = [
    { id: "email" as const, label: t("login.use_email") },
    { id: "phone" as const, label: t("login.use_phone") },
  ];
  return (
    <div className="grid gap-5">
      <div role="tablist" aria-label={t("login.title")} className="grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={method === tab.id}
            onClick={() => setMethod(tab.id)}
            className={cn(
              "h-10 cursor-pointer rounded-full text-sm font-bold transition-colors",
              method === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {method === "email" ? <LoginForm /> : <PhoneLoginForm />}
    </div>
  );
}

export function LoginPage() {
  const { t } = useLocale();

  return (
    <AuthShell illustration={<LoginIllustration />}>
      <Link href="/" className="mb-5 flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        {t("login.back")}
      </Link>

      <div className="mb-5 grid justify-items-start gap-2">
        <SectionTag>{t("login.tag")}</SectionTag>
        <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[34px]">{t("login.title")}</h1>
        <p className="text-muted-foreground">{t("login.description")}</p>
      </div>

      <SignInMethods />

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("login.no_account")}{" "}
        <Link href="/contact" className="font-bold text-primary hover:underline">
          {t("login.book_demo")}
        </Link>
      </p>
    </AuthShell>
  );
}

export default LoginPage;

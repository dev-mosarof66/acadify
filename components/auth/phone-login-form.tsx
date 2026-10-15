"use client";

import * as React from "react";
import { ArrowRight, CircleAlert, Loader2, Smartphone } from "lucide-react";
import { createAuthClient } from "@neondatabase/auth/next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/providers/locale-provider";
import { completePhoneSignInAction, type AuthErrorCode } from "@/lib/auth/actions";
import { maskPhone, toE164 } from "@/lib/auth/phone";
import { cn } from "@/lib/utils";

const authClient = createAuthClient();
const CONTROL = "h-11 rounded-xl bg-card px-4 text-[14.5px] md:text-[14.5px] dark:bg-card";
const RESEND_SECONDS = 60;

type Problem = "phone" | "send" | "code" | "rate" | "network" | AuthErrorCode;
const PROBLEM_KEYS: Record<string, string> = {
  phone: "login.error_phone",
  send: "login.error_phone_send",
  code: "login.error_code",
  "bad-code": "login.error_code",
  rate: "login.error_rate",
  network: "login.error_network",
  banned: "login.error_banned",
  "no-institute": "login.error_no_institute",
  invalid: "login.error_code",
};

type AuthClientError = { code?: string; status?: number; message?: string } | null | undefined;

/** Which problem a Neon Auth error is, without revealing whether a number is registered. */
function classify(error: AuthClientError, step: "send" | "verify"): Problem | "unregistered" {
  const code = (error?.code ?? "").toUpperCase();
  if (error?.status === 429 || code.includes("TOO_MANY")) return "rate";
  if (code.startsWith("NETWORK")) return "network";
  if (code.includes("BANNED")) return "banned";
  if (step === "send" && (code.includes("NOT_EXIST") || code.includes("NOT_FOUND") || code.includes("USER"))) return "unregistered";
  if (step === "verify") return "code";
  return "send";
}

/** Sign in with a mobile number: enter the number, then the 6-digit code sent by SMS. */
export function PhoneLoginForm() {
  const { t } = useLocale();
  const [phone, setPhone] = React.useState("");
  const [e164, setE164] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [problem, setProblem] = React.useState<Problem | null>(null);
  const [cooldown, setCooldown] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = (number: string) =>
    startTransition(async () => {
      setProblem(null);
      try {
        const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: number });
        const kind = error ? classify(error, "send") : null;
        // An unregistered number looks the same as a sent code: the screen never says who has an account
        if (kind && kind !== "unregistered") return setProblem(kind);
        setE164(number);
        setCode("");
        setCooldown(RESEND_SECONDS);
      } catch {
        setProblem("network");
      }
    });

  const onPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const number = toE164(phone);
    if (!number) return setProblem("phone");
    send(number);
  };

  const onCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code) || !e164) return setProblem("code");
    startTransition(async () => {
      setProblem(null);
      try {
        const { error } = await authClient.phoneNumber.verify({ phoneNumber: e164, code });
        if (error) {
          const kind = classify(error, "verify");
          return setProblem(kind === "unregistered" ? "code" : kind);
        }
        // The session is set; run the same role checks and routing as email sign-in (redirects on success)
        const result = await completePhoneSignInAction();
        if (!result.ok) setProblem(result.code);
      } catch {
        setProblem("network");
      }
    });
  };

  const alert = problem && (
    <div role="alert" className="flex gap-3 rounded-xl border border-destructive/30 bg-danger-light p-4 text-sm font-medium">
      <CircleAlert className="mt-0.5 size-[18px] shrink-0 text-destructive" />
      <p>{t(PROBLEM_KEYS[problem] ?? "login.error_unknown")}</p>
    </div>
  );

  if (!e164) {
    return (
      <form method="post" noValidate onSubmit={onPhoneSubmit} className="grid gap-4">
        {alert}
        <div className="grid gap-2">
          <Label htmlFor="login-phone" className="text-[13.5px] font-bold">
            {t("login.phone")}
          </Label>
          <div className="relative">
            <Smartphone className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => (setPhone(e.target.value), setProblem(null))}
              aria-invalid={problem === "phone" || undefined}
              className={cn(CONTROL, "pl-11")}
            />
          </div>
          <p className="text-[12.5px] text-muted-foreground">{t("login.phone_help")}</p>
        </div>
        <SubmitButton pending={pending} label={t("login.phone_send")} />
      </form>
    );
  }

  return (
    <form method="post" noValidate onSubmit={onCodeSubmit} className="grid gap-4">
      {alert}
      <p className="text-sm text-muted-foreground">
        {t("login.phone_sent")} <span className="font-bold text-foreground tabular-nums">{maskPhone(e164)}</span>
      </p>
      <div className="grid gap-2">
        <Label htmlFor="login-phone-code" className="text-[13.5px] font-bold">
          {t("login.phone_code")}
        </Label>
        <Input
          id="login-phone-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => (setCode(e.target.value.replace(/\D/g, "").slice(0, 6)), setProblem(null))}
          aria-invalid={problem === "code" || problem === "bad-code" || undefined}
          className={cn(CONTROL, "text-center text-lg font-bold tracking-[0.4em] tabular-nums")}
        />
        <p className="text-[12.5px] text-muted-foreground">{t("login.phone_code_hint")}</p>
      </div>
      <SubmitButton pending={pending} label={t("login.submit")} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-bold">
        <button type="button" onClick={() => (setE164(null), setProblem(null))} className="cursor-pointer text-muted-foreground hover:text-primary">
          {t("login.phone_change")}
        </button>
        <button type="button" disabled={cooldown > 0 || pending} onClick={() => send(e164)} className="cursor-pointer text-primary enabled:hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground">
          {cooldown > 0 ? t("login.phone_resend_in").replace("{s}", String(cooldown)) : t("login.phone_resend")}
        </button>
      </div>
    </form>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-12 w-full justify-between rounded-full pr-2 pl-6 text-[15px] font-bold shadow-[0_10px_22px_-10px_var(--primary)] hover:bg-primary-hover"
    >
      {label}
      <span className="grid size-9 place-items-center rounded-full bg-primary-foreground text-primary">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" strokeWidth={2.4} />}
      </span>
    </Button>
  );
}

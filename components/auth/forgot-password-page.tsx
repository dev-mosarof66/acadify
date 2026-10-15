"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/providers/locale-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotIllustration } from "@/components/auth/illustrations";
import { SectionTag } from "@/components/landing/shared";
import { cn } from "@/lib/utils";
import { resetPasswordWithCode, sendResetCode, verifyResetCode, type AuthErrorCode } from "@/lib/auth/actions";

type Step = "request" | "verify" | "reset" | "done";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toAscii = (v: string) => v.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

const ERROR_KEYS: Partial<Record<AuthErrorCode, string>> = {
  rate: "login.error_rate",
  network: "login.error_network",
  "bad-code": "forgot.error_bad_code",
  expired: "forgot.error_expired",
  "weak-password": "forgot.error_weak",
  invalid: "login.error_identifier",
};
const errorKey = (code: AuthErrorCode, fallback: string) => ERROR_KEYS[code] ?? fallback;

const CONTROL = "h-11 rounded-xl bg-card px-4 text-[14.5px] md:text-[14.5px] dark:bg-card";
const SUBMIT =
  "h-12 w-full justify-between rounded-full pr-2 pl-6 text-[15px] font-bold shadow-[0_10px_22px_-10px_var(--primary)] hover:bg-primary-hover";

/** "you@example.com" → "yo•••@example.com", "01712345678" → "017•••••678" */
function maskIdentifier(value: string) {
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 2)}•••@${domain}`;
  }
  return `${value.slice(0, 3)}•••••${value.slice(-3)}`;
}

function SubmitButton({ loading, children, loadingText }: { loading: boolean; children: React.ReactNode; loadingText: string }) {
  return (
    <Button type="submit" disabled={loading} className={SUBMIT}>
      {loading ? loadingText : children}
      <span className="grid size-9 place-items-center rounded-full bg-primary-foreground text-primary">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" strokeWidth={2.4} />}
      </span>
    </Button>
  );
}

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="text-[12.5px] font-semibold text-destructive">
      {children}
    </p>
  );
}

function RequestStep({ onSent, initialEmail = "" }: { onSent: (identifier: string) => void; initialEmail?: string }) {
  const { t } = useLocale();
  const [value, setValue] = React.useState(initialEmail);
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = value.trim().toLowerCase();
    if (!email) return setError(t("login.error_required"));
    if (!EMAIL.test(email)) return setError(t("login.error_identifier"));
    setLoading(true);
    const result = await sendResetCode(email);
    setLoading(false);
    if (!result.ok) return setError(t(errorKey(result.code, "forgot.error_send")));
    onSent(email);
  };

  return (
    <form method="post" noValidate onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="forgot-identifier" className="text-[13.5px] font-bold">
          {t("login.identifier")}
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            id="forgot-identifier"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            placeholder={t("login.identifier_placeholder")}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(undefined);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "forgot-identifier-error" : undefined}
            className={cn(CONTROL, "pl-11")}
          />
        </div>
        <FieldError id="forgot-identifier-error">{error}</FieldError>
      </div>
      <SubmitButton loading={loading} loadingText={t("forgot.sending")}>
        {t("forgot.send_code")}
      </SubmitButton>
    </form>
  );
}

function VerifyStep({ identifier, onVerified, onChange }: { identifier: string; onVerified: (code: string) => void; onChange: () => void }) {
  const { t } = useLocale();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);
  const [seconds, setSeconds] = React.useState(RESEND_SECONDS);
  const [resent, setResent] = React.useState(false);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length < 6) return setError(t("forgot.error_code"));
    setLoading(true);
    const result = await verifyResetCode(identifier, code);
    setLoading(false);
    if (!result.ok) return setError(t(errorKey(result.code, "forgot.error_bad_code")));
    onVerified(code);
  };

  const resend = async () => {
    const result = await sendResetCode(identifier);
    if (!result.ok) return setError(t(errorKey(result.code, "forgot.error_send")));
    setError(undefined);
    setSeconds(RESEND_SECONDS);
    setResent(true);
    setCode("");
  };

  return (
    <form method="post" noValidate onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="forgot-code" className="text-[13.5px] font-bold">
          {t("forgot.code_label")}
        </Label>
        <InputOTP
          id="forgot-code"
          maxLength={6}
          autoFocus
          inputMode="numeric"
          pattern="^[0-9০-৯]*$"
          value={code}
          onChange={(v) => {
            setCode(toAscii(v));
            setError(undefined);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "forgot-code-error" : undefined}
          containerClassName="w-full"
        >
          <InputOTPGroup className="grid w-full grid-cols-6 gap-2 rounded-none">
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                aria-invalid={error ? true : undefined}
                className="h-14 w-full rounded-xl border bg-card text-xl font-extrabold first:rounded-xl first:border-l last:rounded-xl data-[active=true]:border-primary dark:bg-card"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <FieldError id="forgot-code-error">{error}</FieldError>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        {seconds > 0 ? (
          <span className="text-muted-foreground tabular-nums" aria-live="polite">
            {resent && seconds > RESEND_SECONDS - 5 ? t("forgot.resent") : t("forgot.resend_in").replace("{s}", String(seconds))}
          </span>
        ) : (
          <button type="button" onClick={resend} className="cursor-pointer font-bold text-primary hover:underline">
            {t("forgot.resend")}
          </button>
        )}
        <button type="button" onClick={onChange} className="cursor-pointer font-semibold text-muted-foreground hover:text-primary">
          {t("forgot.change")}
        </button>
      </div>

      <SubmitButton loading={loading} loadingText={t("forgot.verifying")}>
        {t("forgot.verify")}
      </SubmitButton>
      <span className="sr-only">{identifier}</span>
    </form>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  autoFocus,
  placeholder,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoFocus?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  const [show, setShow] = React.useState(false);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-[13.5px] font-bold">
        {label}
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(CONTROL, "pr-12 pl-11")}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t("login.hide_password") : t("login.show_password")}
          aria-pressed={show}
          className="absolute top-1/2 right-1.5 size-9 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-primary"
        >
          {show ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      {children}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

/** 0 = empty, 1 weak … 4 strong. Only "strong" (8+ chars, lowercase, uppercase, number, special character) is accepted. */
function passwordStrength(pw: string) {
  const checks = [
    pw.length >= 8,
    /[a-zঀ-৿]/.test(pw), // lowercase (Bangla letters count, they have no case)
    /[A-Z]/.test(pw),
    /[0-9০-৯]/.test(pw),
    /[^\p{L}\p{M}0-9০-৯\s]/u.test(pw), // special character
  ];
  const met = checks.filter(Boolean).length;
  // 1-2 met → weak, 3 → fair, 4 → good, all 5 → strong
  const score = !pw ? 0 : met <= 2 ? 1 : met - 1;
  return { score, acceptable: met === checks.length };
}

const STRENGTH_LEVELS = [
  { key: "forgot.strength_weak", bar: "bg-destructive", text: "text-destructive" },
  { key: "forgot.strength_fair", bar: "bg-accent", text: "text-accent-foreground dark:text-accent" },
  { key: "forgot.strength_good", bar: "bg-primary-bright", text: "text-primary" },
  { key: "forgot.strength_strong", bar: "bg-primary", text: "text-primary" },
] as const;

function StrengthMeter({ score }: { score: number }) {
  const { t } = useLocale();
  const level = score > 0 ? STRENGTH_LEVELS[score - 1] : null;
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden>
        {STRENGTH_LEVELS.map((_, i) => (
          <span key={i} className={cn("h-1.5 rounded-full transition-colors", level && i < score ? level.bar : "bg-secondary")} />
        ))}
      </div>
      <p className="flex justify-between text-[12.5px] font-semibold" aria-live="polite">
        <span className="text-muted-foreground">{t("forgot.strength_label")}</span>
        {level && <span className={level.text}>{t(level.key)}</span>}
      </p>
    </div>
  );
}

function ResetStep({ email, code, onDone, onBadCode }: { email: string; code: string; onDone: () => void; onBadCode: () => void }) {
  const { t } = useLocale();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = React.useState(false);

  const strength = passwordStrength(password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!password) next.password = t("login.error_required");
    else if (!strength.acceptable) next.password = t("forgot.error_weak");
    if (!confirm) next.confirm = t("login.error_required");
    else if (confirm !== password) next.confirm = t("forgot.error_match");
    setErrors(next);
    if (next.password || next.confirm) {
      document.getElementById(next.password ? "forgot-password" : "forgot-confirm")?.focus();
      return;
    }
    setLoading(true);
    const result = await resetPasswordWithCode(email, code, password);
    setLoading(false);
    if (result.ok) return onDone();
    if (result.code === "bad-code") return onBadCode();
    setErrors({ password: t(errorKey(result.code, "login.error_unknown")) });
  };

  return (
    <form method="post" noValidate onSubmit={onSubmit} className="grid gap-4">
      <PasswordInput
        id="forgot-password"
        label={t("forgot.new_password")}
        value={password}
        autoFocus
        onChange={(v) => {
          setPassword(v);
          setErrors((er) => ({ ...er, password: undefined }));
        }}
        placeholder={t("forgot.new_password_placeholder")}
        error={errors.password}
      >
        <StrengthMeter score={strength.score} />
      </PasswordInput>
      <PasswordInput
        id="forgot-confirm"
        label={t("forgot.confirm_password")}
        placeholder={t("forgot.confirm_password_placeholder")}
        value={confirm}
        onChange={(v) => {
          setConfirm(v);
          setErrors((er) => ({ ...er, confirm: undefined }));
        }}
        error={errors.confirm}
      />
      <SubmitButton loading={loading} loadingText={t("forgot.updating")}>
        {t("forgot.update")}
      </SubmitButton>
    </form>
  );
}

const STEPS: Exclude<Step, "done">[] = ["request", "verify", "reset"];
const BN_NUM = (n: number, locale: string) => (locale === "bn" ? String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : String(n));

export function ForgotPasswordPage() {
  const { t, locale } = useLocale();
  const [step, setStep] = React.useState<Step>("request");
  const [identifier, setIdentifier] = React.useState("");
  const [code, setCode] = React.useState("");
  const [codeExpired, setCodeExpired] = React.useState(false);
  const searchParams = useSearchParams();
  const prefill = (searchParams.get("email") ?? "").slice(0, 254);
  const loginHref = "/login";

  const index = STEPS.indexOf(step as Exclude<Step, "done">);
  const heading =
    step === "request"
      ? { title: t("forgot.request_title"), desc: t("forgot.request_desc") }
      : step === "verify"
        ? { title: t("forgot.verify_title"), desc: t("forgot.verify_desc").replace("{to}", maskIdentifier(identifier)) }
        : step === "reset"
          ? { title: t("forgot.reset_title"), desc: t("forgot.reset_desc") }
          : null;

  return (
    <AuthShell illustration={<ForgotIllustration />}>
      <Link href={loginHref} className="mb-5 flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" />
        {t("forgot.back_login")}
      </Link>

      {step === "done" ? (
        <div className="grid justify-items-center gap-3 text-center" role="status">
          <span className="grid size-[76px] place-items-center rounded-full bg-primary-light">
            <CircleCheck className="size-10 text-primary" />
          </span>
          <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.03em]">{t("forgot.done_title")}</h1>
          <p className="text-muted-foreground">{t("forgot.done_desc")}</p>
          <Button nativeButton={false} render={<Link href={loginHref} />} className={cn(SUBMIT, "mt-3")}>
            {t("forgot.back_login")}
            <span className="grid size-9 place-items-center rounded-full bg-primary-foreground text-primary">
              <ArrowRight className="size-4" strokeWidth={2.4} />
            </span>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <SectionTag>{t("forgot.tag")}</SectionTag>
              <span className="text-[12.5px] font-semibold text-muted-foreground">
                {t("forgot.step").replace("{n}", BN_NUM(index + 1, locale))}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1.5" aria-hidden>
              {STEPS.map((s, i) => (
                <span key={s} className={cn("h-1.5 rounded-full transition-colors", i <= index ? "bg-primary" : "bg-secondary")} />
              ))}
            </div>
            <h1 className="mt-2 text-[30px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[34px]">{heading?.title}</h1>
            <p className="text-muted-foreground">{heading?.desc}</p>
          </div>

          {step === "request" && (
            <RequestStep
              initialEmail={identifier || prefill}
              onSent={(id) => {
                setIdentifier(id);
                setStep("verify");
              }}
            />
          )}
          {step === "verify" && (
            <>
              {codeExpired && (
                <p role="alert" className="mb-4 rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
                  {t("forgot.error_bad_code")}
                </p>
              )}
              <VerifyStep
                identifier={identifier}
                onVerified={(c) => {
                  setCode(c);
                  setCodeExpired(false);
                  setStep("reset");
                }}
                onChange={() => setStep("request")}
              />
            </>
          )}
          {step === "reset" && (
            <ResetStep
              email={identifier}
              code={code}
              onDone={() => setStep("done")}
              onBadCode={() => {
                setCodeExpired(true);
                setStep("verify");
              }}
            />
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {t("forgot.remembered")}{" "}
            <Link href={loginHref} className="font-bold text-primary hover:underline">
              {t("forgot.sign_in")}
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

export default ForgotPasswordPage;

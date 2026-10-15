"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/providers/locale-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginIllustration } from "@/components/auth/illustrations";
import { SectionTag } from "@/components/landing/shared";
import { sendAdminCodeAction, signOutAction, verifyAdminCodeAction, type AuthErrorCode } from "@/lib/auth/actions";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toAscii = (v: string) => v.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

const ERROR_KEYS: Partial<Record<AuthErrorCode, string>> = {
  "bad-code": "forgot.error_bad_code",
  expired: "verify.error_expired",
  rate: "login.error_rate",
  "send-failed": "verify.error_send",
  network: "login.error_network",
};

/** "you@example.com" → "yo•••@example.com" */
const maskEmail = (email: string) => {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}•••@${domain}`;
};

export function AdminVerifyPage({ email }: { email: string }) {
  const { t } = useLocale();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<AuthErrorCode | "incomplete" | null>(null);
  const [sending, setSending] = React.useState(true);
  const [seconds, setSeconds] = React.useState(0);
  const [resent, setResent] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const started = React.useRef(false);

  const send = React.useCallback(async (resend: boolean) => {
    setSending(true);
    // A failed request (server error, dropped connection) shows a message instead of an unhandled rejection
    const result = await sendAdminCodeAction(resend).catch(() => ({ ok: false as const, code: "send-failed" as const }));
    setSending(false);
    if (!result.ok) return setError(result.code);
    setError(null);
    setSeconds(result.retryInSeconds);
    if (resend) {
      setResent(true);
      setCode("");
    }
  }, []);

  // Send the first code once (a reload within a minute reuses the code already sent)
  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    void send(false);
  }, [send]);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const submit = (value = code) => {
    if (value.length < 6) return setError("incomplete");
    setError(null);
    startTransition(async () => {
      // Redirects to the admin portal on success
      let result: Awaited<ReturnType<typeof verifyAdminCodeAction>>;
      try {
        result = await verifyAdminCodeAction(value);
      } catch (err) {
        // The success path throws Next's redirect signal; let it through
        if (err && typeof err === "object" && "digest" in err && String(err.digest).startsWith("NEXT_REDIRECT")) throw err;
        result = { ok: false, code: "network" };
      }
      if (!result.ok) {
        setError(result.code);
        setCode("");
      }
    });
  };

  const errorText = error === "incomplete" ? t("forgot.error_code") : error ? t(ERROR_KEYS[error] ?? "login.error_unknown") : null;

  return (
    <AuthShell illustration={<LoginIllustration />}>
      <form action={() => signOutAction()} className="mb-5">
        <button type="submit" className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          {t("verify.other_account")}
        </button>
      </form>

      <div className="mb-5 grid justify-items-start gap-2">
        <SectionTag>{t("verify.tag")}</SectionTag>
        <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[34px]">{t("verify.title")}</h1>
        <p className="text-muted-foreground">{t("verify.desc").replace("{to}", maskEmail(email))}</p>
      </div>

      <form
        method="post"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid gap-4"
      >
        <div className="grid gap-2">
          <Label htmlFor="admin-code" className="text-[13.5px] font-bold">
            {t("forgot.code_label")}
          </Label>
          <InputOTP
            id="admin-code"
            maxLength={6}
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="^[0-9০-৯]*$"
            value={code}
            disabled={pending}
            onChange={(v) => {
              setCode(toAscii(v));
              setError(null);
            }}
            onComplete={(v: string) => submit(toAscii(v))}
            aria-invalid={errorText ? true : undefined}
            aria-describedby={errorText ? "admin-code-error" : undefined}
            containerClassName="w-full"
          >
            <InputOTPGroup className="grid w-full grid-cols-6 gap-2 rounded-none">
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  aria-invalid={errorText ? true : undefined}
                  className="h-14 w-full rounded-xl border bg-card text-xl font-extrabold first:rounded-xl first:border-l last:rounded-xl data-[active=true]:border-primary dark:bg-card"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {errorText && (
            <p id="admin-code-error" role="alert" className="text-[12.5px] font-semibold text-destructive">
              {errorText}
            </p>
          )}
        </div>

        <div className="flex min-h-5 items-center text-[13px]" aria-live="polite">
          {sending ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("verify.sending")}
            </span>
          ) : seconds > 0 ? (
            <span className="text-muted-foreground tabular-nums">
              {resent && seconds > 55 ? t("forgot.resent") : t("forgot.resend_in").replace("{s}", String(seconds))}
            </span>
          ) : (
            <button type="button" onClick={() => send(true)} className="cursor-pointer font-bold text-primary hover:underline">
              {t("forgot.resend")}
            </button>
          )}
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="h-12 w-full justify-between rounded-full pr-2 pl-6 text-[15px] font-bold shadow-[0_10px_22px_-10px_var(--primary)] hover:bg-primary-hover"
        >
          {pending ? t("forgot.verifying") : t("verify.submit")}
          <span className="grid size-9 place-items-center rounded-full bg-primary-foreground text-primary">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" strokeWidth={2.4} />}
          </span>
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          {t("verify.why")}
        </p>
      </form>
    </AuthShell>
  );
}

export default AdminVerifyPage;

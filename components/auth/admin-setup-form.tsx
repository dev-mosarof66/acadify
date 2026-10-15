"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, KeyRound, Loader2, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionTag } from "@/components/landing/shared";
import { setupFirstAdmin, type AuthErrorCode } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const CONTROL = "h-11 rounded-xl bg-card px-4 pl-11 text-[14.5px] md:text-[14.5px] dark:bg-card";

const MESSAGES: Partial<Record<AuthErrorCode, string>> = {
  "setup-token": "That setup token is wrong. Copy ADMIN_SETUP_TOKEN from .env.local exactly.",
  "setup-done": "A super admin already exists. Sign in instead.",
  "weak-password": "Use 8+ characters with an uppercase letter, a lowercase letter, a number and a special character.",
  invalid: "Enter your name and a valid email address.",
  exists: "An account with this email already exists. Sign in, then ask an existing super admin to promote it.",
  network: "We couldn't reach the sign-in service. Check NEON_AUTH_BASE_URL and your connection.",
  unverified: "Account created. Verify the email address from your inbox, then sign in at /login.",
};

function Field({ id, label, icon: Icon, ...input }: { id: string; label: string; icon: React.ElementType } & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-[13.5px] font-bold">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <Input id={id} className={CONTROL} {...input} />
      </div>
    </div>
  );
}

export function AdminSetupForm({ alreadySetUp }: { alreadySetUp: boolean }) {
  const [error, setError] = React.useState<AuthErrorCode | null>(alreadySetUp ? "setup-done" : null);
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      // Redirects to /admin on success
      const result = await setupFirstAdmin(form);
      if (!result.ok) setError(result.code);
    });
  };

  return (
    <>
      <div className="mb-5 grid justify-items-start gap-2">
        <SectionTag>One-time setup</SectionTag>
        <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.03em]">Create the first super admin</h1>
        <p className="text-muted-foreground">This page works only until the first super admin exists. Add more admins later from the console.</p>
      </div>

      {error && (
        <div role="alert" className={cn("mb-4 flex gap-3 rounded-xl p-4 text-sm font-medium", error === "setup-done" ? "bg-primary-light" : "border border-destructive/30 bg-danger-light")}>
          <CircleAlert className={cn("mt-0.5 size-[18px] shrink-0", error === "setup-done" ? "text-primary" : "text-destructive")} />
          <p>
            {MESSAGES[error] ?? "Something went wrong. Please try again."}{" "}
            {(error === "setup-done" || error === "exists" || error === "unverified") && (
              <Link href="/login" className="font-bold text-primary underline underline-offset-3">
                Go to sign-in
              </Link>
            )}
          </p>
        </div>
      )}

      {!alreadySetUp && (
        <form method="post" onSubmit={onSubmit} className="grid gap-4">
          <Field id="setup-token" name="token" label="Setup token" icon={KeyRound} type="password" required autoComplete="off" placeholder="From ADMIN_SETUP_TOKEN in .env.local" />
          <Field id="setup-name" name="name" label="Your name" icon={UserRound} required autoComplete="name" placeholder="e.g. Tahmid Rahman" />
          <Field id="setup-email" name="email" label="Email" icon={Mail} type="email" required autoComplete="email" placeholder="you@acadify.app" />
          <Field
            id="setup-password"
            name="password"
            label="Password"
            icon={Lock}
            type="password"
            required
            autoComplete="new-password"
            placeholder="8+ chars with Aa, 1 and a symbol"
          />
          <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full justify-between rounded-full pr-2 pl-6 text-[15px] font-bold shadow-[0_10px_22px_-10px_var(--primary)] hover:bg-primary-hover"
          >
            {pending ? "Creating account…" : "Create super admin"}
            <span className="grid size-9 place-items-center rounded-full bg-primary-foreground text-primary">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" strokeWidth={2.4} />}
            </span>
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            The token is checked on the server and never sent anywhere else.
          </p>
        </form>
      )}
    </>
  );
}

export default AdminSetupForm;

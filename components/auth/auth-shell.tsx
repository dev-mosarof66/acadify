"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";

/** One-screen split layout for auth pages: content on the left, a green illustration panel on the right (desktop). */
export function AuthShell({ children, illustration }: { children: React.ReactNode; illustration: React.ReactNode }) {
  const { t } = useLocale();

  return (
    <div className="grid min-h-dvh gap-4 p-4 sm:p-5 lg:h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:overflow-hidden">
      <div className="flex min-h-0 flex-col">
        <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-4">{children}</main>

        <p className="text-center text-[12.5px] text-muted-foreground">
          © 2026 {t("app.title")}. {t("footer.rights")}{" "}
          <Link href="/privacy" className="hover:text-primary">
            {t("footer.privacy")}
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:text-primary">
            {t("footer.terms")}
          </Link>
        </p>
      </div>

      <div className="relative hidden min-h-0 items-center justify-center overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#1F5F1F_0%,#2C7A26_55%,#57B53A_100%)] p-8 lg:flex">
        <span aria-hidden className="absolute -right-24 -bottom-24 size-80 rounded-full bg-white/10" />
        <span aria-hidden className="absolute -top-16 -left-16 size-56 rounded-full bg-white/5" />
        <div className="relative h-full max-h-[620px] w-full max-w-[600px] [&>svg]:size-full">{illustration}</div>
      </div>
    </div>
  );
}

export default AuthShell;

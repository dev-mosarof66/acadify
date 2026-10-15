import { Suspense } from "react";
import type { Metadata } from "next";

import ForgotPasswordPage from "@/components/auth/forgot-password-page";

export const metadata: Metadata = {
  title: "Reset Password — Acadify",
  description: "Reset your Acadify portal password with a one-time code.",
};

export default function Page() {
  return (
    // Suspense: reads ?email= to prefill the form
    <Suspense>
      <ForgotPasswordPage />
    </Suspense>
  );
}

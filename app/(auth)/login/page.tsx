import { Suspense } from "react";
import type { Metadata } from "next";

import LoginPage from "@/components/auth/login-page";

export const metadata: Metadata = {
  title: "Sign In — Acadify",
  description: "Sign in to your institute's Acadify portal.",
};

export default function Page() {
  return (
    // Suspense: the form reads ?error= from the URL
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}

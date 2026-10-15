"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Locale } from "@/lib/i18n/types";

export function LanguageToggle() {
  const { locale, setLocale, meta, locales } = useLocale();

  const cycleLanguage = () => {
    const currentIndex = locales.findIndex((l) => l.code === locale);
    const nextIndex = (currentIndex + 1) % locales.length;
    setLocale(locales[nextIndex].code as Locale);
  };

  const nextLocale = locales[(locales.findIndex((l) => l.code === locale) + 1) % locales.length];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleLanguage}
      className="h-9 px-2.5 gap-1.5 rounded-lg hover:bg-muted font-medium text-xs transition-colors cursor-pointer"
      title={`Switch to ${nextLocale.label} (${nextLocale.nativeLabel})`}
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4 text-primary" />
      <span className="font-semibold tracking-wide">
        {meta.nativeLabel}
      </span>
    </Button>
  );
}

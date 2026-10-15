"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_LOCALE, Locale, LOCALES, LocaleMeta } from "@/lib/i18n/types";
import { translations } from "@/lib/i18n/translations";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  meta: LocaleMeta;
  t: (key: string, fallback?: string) => string;
  locales: LocaleMeta[];
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Bumped from "acadify_locale" so earlier saved choices reset to the default
const STORAGE_KEY = "acadify_locale_v2";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && LOCALES[saved]) {
        // Restored after hydration on purpose: reading storage during render would mismatch the server HTML
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocaleState(saved);
      }
    } catch {
      // LocalStorage access fallback
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Ignore
    }

    document.documentElement.lang = locale;
  }, [locale, mounted]);

  const setLocale = (newLocale: Locale) => {
    if (LOCALES[newLocale]) {
      setLocaleState(newLocale);
    }
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[locale] || translations.en;
    if (dict && dict[key]) {
      return dict[key];
    }
    // Fallback to English
    if (translations.en[key]) {
      return translations.en[key];
    }
    return fallback ?? key;
  };

  const meta = LOCALES[locale];
  const locales = Object.values(LOCALES);

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        meta,
        t,
        locales,
      }}
    >
      <div className={meta.fontClass}>
        {children}
      </div>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

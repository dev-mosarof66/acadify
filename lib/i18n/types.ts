export type Locale = "en" | "bn";

export const DEFAULT_LOCALE: Locale = "en";

export interface LocaleMeta {
  code: Locale;
  label: string;
  nativeLabel: string;
  fontClass: string;
}

export const LOCALES: Record<Locale, LocaleMeta> = {
  en: {
    code: "en",
    label: "English",
    nativeLabel: "English",
    fontClass: "font-sans",
  },
  bn: {
    code: "bn",
    label: "Bengali",
    nativeLabel: "বাংলা",
    fontClass: "font-bengali",
  },
};

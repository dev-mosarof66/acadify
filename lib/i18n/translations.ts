import { Locale } from "./types";
import { en } from "./locales/en";
import { bn } from "./locales/bn";

export { en, bn };

export const translations: Record<Locale, Record<string, string>> = {
  en,
  bn,
};

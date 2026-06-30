/** Locale configuration: Chinese is the default/primary language; English is the globally switchable alternative */
export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Default locale: Chinese first */
export const DEFAULT_LOCALE: Locale = "zh";

/** Labels shown in the language switcher */
export const LOCALE_LABELS: Record<Locale, string> = {
  zh: "中文",
  en: "English",
};

/** Bilingual message entries for a single namespace (one page/module) */
export interface NamespaceMessages {
  zh: Record<string, string>;
  en: Record<string, string>;
}

/**
 * Auto-detects the UI locale from the user's system/browser language.
 * Chinese systems (zh / zh-CN / zh-TW…) → zh; everything else → en (English as the global fallback).
 * Returns the default locale in environments without navigator (SSR).
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const langs = (navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language]) as string[];
  for (const l of langs) {
    if (!l) continue;
    if (l.toLowerCase().startsWith("zh")) return "zh";
    // Any explicit non-Chinese language match falls back to English (we only support zh/en)
    return "en";
  }
  return DEFAULT_LOCALE;
}

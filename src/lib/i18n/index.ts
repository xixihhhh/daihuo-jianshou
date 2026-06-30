"use client";

/**
 * Lightweight frontend i18n (zero dependencies).
 *
 * The locale is stored in the zustand settings store (persisted in localStorage); Chinese is the default.
 * Usage: `const t = useT("home"); <h1>{t("title")}</h1>` — missing keys fall back to the default locale, then to the key itself.
 * Supports interpolation: `t("count", { n: 3 })` matches an entry like "total: {n} items".
 */

import { useSettingsStore } from "@/lib/stores/settings-store";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { messages } from "./messages";

/** Returns the current UI locale */
export function useLocale(): Locale {
  return useSettingsStore((s) => s.locale);
}

/** Returns a setter for the UI locale */
export function useSetLocale(): (locale: Locale) => void {
  return useSettingsStore((s) => s.setLocale);
}

type Vars = Record<string, string | number>;

function interpolate(tpl: string, vars?: Vars): string {
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

/**
 * Returns a translation function scoped to the given namespace.
 * @param namespace Message namespace (typically corresponds to a page, e.g. "home" / "settings")
 */
export function useT(namespace: string): (key: string, vars?: Vars) => string {
  const locale = useLocale();
  return (key: string, vars?: Vars): string => {
    const dict = messages[locale]?.[namespace];
    const fallback = messages[DEFAULT_LOCALE]?.[namespace];
    const tpl = dict?.[key] ?? fallback?.[key] ?? key;
    return interpolate(tpl, vars);
  };
}

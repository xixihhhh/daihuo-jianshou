"use client";

import { LuLanguages } from "react-icons/lu";
import { useLocale, useSetLocale } from "@/lib/i18n";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";

/**
 * 语言切换：中文 ⇄ English。点击在两种语言间循环切换，存到 settings store（localStorage 持久化）。
 * 放在各页顶部导航。
 */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const setLocale = useSetLocale();

  const toggle = () => {
    const idx = LOCALES.indexOf(locale);
    setLocale(LOCALES[(idx + 1) % LOCALES.length]);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={locale === "zh" ? "Switch to English" : "切换到中文"}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${className}`}
    >
      <LuLanguages className="w-3.5 h-3.5" />
      <span>{LOCALE_LABELS[locale]}</span>
    </button>
  );
}

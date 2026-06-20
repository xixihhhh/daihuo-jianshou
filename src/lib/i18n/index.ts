"use client";

/**
 * 轻量级前端国际化（零依赖）。
 *
 * 语言存于 zustand settings store（localStorage 持久化），中文为默认。
 * 用法：`const t = useT("home"); <h1>{t("title")}</h1>`，缺词时回退到默认语言再回退到 key。
 * 支持插值：`t("count", { n: 3 })` 对应词条 "共 {n} 个"。
 */

import { useSettingsStore } from "@/lib/stores/settings-store";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { messages } from "./messages";

/** 读取当前界面语言 */
export function useLocale(): Locale {
  return useSettingsStore((s) => s.locale);
}

/** 设置界面语言 */
export function useSetLocale(): (locale: Locale) => void {
  return useSettingsStore((s) => s.setLocale);
}

type Vars = Record<string, string | number>;

function interpolate(tpl: string, vars?: Vars): string {
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

/**
 * 取某命名空间的翻译函数。
 * @param namespace 词条命名空间（一般对应一个页面，如 "home" / "settings"）
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

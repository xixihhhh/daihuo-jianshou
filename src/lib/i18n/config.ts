/** 多语言配置：中文为默认/主语言，English 为可切换的全球语 */
export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** 默认语言：中文优先 */
export const DEFAULT_LOCALE: Locale = "zh";

/** 语言切换器上显示的名字 */
export const LOCALE_LABELS: Record<Locale, string> = {
  zh: "中文",
  en: "English",
};

/** 一个命名空间（一个页面/模块）的双语词条 */
export interface NamespaceMessages {
  zh: Record<string, string>;
  en: Record<string, string>;
}

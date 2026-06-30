/**
 * Unified export for all category templates
 */

import { beautyTemplates, beautyPromptDirective } from "./beauty";
import { foodTemplates, foodPromptDirective } from "./food";
import { homeTemplates, homePromptDirective } from "./home";
import { fashionTemplates, fashionPromptDirective } from "./fashion";
import { techTemplates, techPromptDirective } from "./tech";

export { beautyTemplates, beautyPromptDirective } from "./beauty";
export { foodTemplates, foodPromptDirective } from "./food";
export { homeTemplates, homePromptDirective } from "./home";
export { fashionTemplates, fashionPromptDirective } from "./fashion";
export { techTemplates, techPromptDirective } from "./tech";

export type { ScriptTemplate } from "./beauty";

/** Product category type */
export type ProductCategory = "beauty" | "food" | "home" | "fashion" | "tech";

/** Map of category keys to display names */
export const categoryNameMap: Record<ProductCategory, string> = {
  beauty: "美妆护肤",
  food: "食品零食",
  home: "家居日用",
  fashion: "服饰鞋包",
  tech: "数码3C",
};

/** Lookup table mapping each category to its templates and prompt directive */
const categoryMap = {
  beauty: { templates: beautyTemplates, directive: beautyPromptDirective },
  food: { templates: foodTemplates, directive: foodPromptDirective },
  home: { templates: homeTemplates, directive: homePromptDirective },
  fashion: { templates: fashionTemplates, directive: fashionPromptDirective },
  tech: { templates: techTemplates, directive: techPromptDirective },
} as const;

/** Returns templates and prompt directive for a given category; falls back to beauty for unknown categories to avoid crashes */
export function getTemplatesByCategory(category: ProductCategory) {
  return categoryMap[category] ?? categoryMap.beauty;
}

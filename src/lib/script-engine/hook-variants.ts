/**
 * Hook A/B variants: keep all subsequent shots of a base script fixed, rewrite only
 * shot 1 (the hook) using different patterns to produce N "same-body, different-opening"
 * comparable variants; each is tagged with hookId for post-campaign winner selection.
 *
 * Pure functions, zero LLM / zero API key — generated directly from the hook pattern library,
 * consistent with the key-free fallback philosophy.
 * Note: the opening voiceover in each variant comes from the pattern library examples;
 * these are "mechanism-level A/B drafts" (for testing which hook type converts better),
 * not word-polished final copy — refine after identifying the winning mechanism.
 */
import type { Shot } from "../db/schema";
import type { ProductCategory } from "./templates";
import { selectHookPatterns, type HookPattern } from "./hook-patterns";

export interface ScriptLike {
  title?: string;
  styleType?: string;
  totalDuration?: number;
  shots: Shot[];
}

export interface HookVariant {
  /** id of the hook pattern used (= HookPattern.id); performance data is aggregated by this key */
  hookId: string;
  hookName: string;
  script: ScriptLike;
}

/** Rewrites shot 1 using the given pattern: replaces voiceover with the pattern's hook example, prepends the pattern's "stop" method to the description (original visual intent preserved) */
function rewriteHookShot(shot: Shot, p: HookPattern): Shot {
  return {
    ...shot,
    type: "hook",
    voiceover: p.example,
    description: shot.description ? `${p.stop}（沿用原画面意图：${shot.description}）` : p.stop,
  };
}

/**
 * Generates N hook variants from a base script (only shot 1 is changed; shots 2..N are kept as-is).
 * If patterns is omitted, category-preferred patterns are used; otherwise the provided set is used.
 */
export function buildHookVariants(
  base: ScriptLike,
  category: ProductCategory,
  n = 3,
  patterns?: HookPattern[]
): HookVariant[] {
  if (!base.shots.length) return [];
  const picks = (patterns ?? selectHookPatterns(category, n)).slice(0, n);
  return picks.map((p) => ({
    hookId: p.id,
    hookName: p.name,
    script: {
      ...base,
      shots: base.shots.map((s, i) => (i === 0 ? rewriteHookShot(s, p) : s)),
    },
  }));
}

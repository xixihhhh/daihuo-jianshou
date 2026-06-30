/**
 * Karaoke per-character highlight subtitles (ASS) — the 2026 TikTok / e-commerce viral subtitle standard:
 * the full sentence stays on screen while each character lights up in sync with the narration as it "sings" through.
 * Because we generate our own TTS and the text is already known, no ASR is needed: each line's duration is
 * split proportionally across characters/words using the \k karaoke timing tag.
 * Pure function that produces ASS text (no disk writes, no ffmpeg calls); unit-testable.
 * The ASS is burned in by the composer via libass (subtitles filter).
 */

import { karaokeSafeMarginV } from "./safe-zone";

export interface KaraokeLine {
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
}

export interface KaraokeStyleOpts {
  fontName?: string; // ASS Fontname; resolved by libass via fontconfig / CoreText / fontsdir
  fontSize?: number;
  /** sung (highlight) colour in ASS &HAABBGGRR format; default yellow */
  primaryColour?: string;
  /** unsung colour; default white */
  secondaryColour?: string;
  outlineColour?: string;
  playResX?: number;
  playResY?: number;
  /** bottom margin in px (PlayRes coordinate space) */
  marginV?: number;
  /** auto-enlarge and highlight units containing digits (prices/discounts/quantities) with an accent colour; default true */
  emphasizeNumbers?: boolean;
  /** accent highlight colour (ASS &HAABBGGRR); default orange-red */
  accentColour?: string;
}

const DEFAULTS = {
  fontName: "PingFang SC",
  fontSize: 46,
  primaryColour: "&H0000F0FF", // yellow (highlight)
  secondaryColour: "&H00FFFFFF", // white (unsung)
  outlineColour: "&H00202020",
  playResX: 1080,
  playResY: 1920,
  marginV: 240,
  emphasizeNumbers: true,
  accentColour: "&H000050FF", // orange-red, for price/discount emphasis
};

/** seconds → ASS timestamp H:MM:SS.cc (centiseconds) */
export function toAssTime(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const cs = Math.round((s - Math.floor(s)) * 100);
  const cc = cs === 100 ? 99 : cs; // prevent carry overflow
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cc).padStart(2, "0")}`;
}

/** Escape special characters in an ASS Text field ({ } delimit override blocks, \ is the control character, newline is \N) */
export function assEscapeText(text: string): string {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r?\n/g, "\\N");
}

/** Split text into karaoke highlight units: CJK per character, Latin per word (trailing space is absorbed into the preceding word to prevent inter-word collapsing) */
export function splitKaraokeUnits(text: string): string[] {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const units: string[] = [];
  let latin = "";
  const flushLatin = () => {
    if (latin) {
      units.push(latin);
      latin = "";
    }
  };
  for (const ch of Array.from(clean)) {
    const isCjk = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/.test(ch);
    if (isCjk) {
      flushLatin();
      units.push(ch);
    } else if (ch === " ") {
      latin += " "; // absorb space into the current Latin word tail; the combined unit is flushed immediately
      flushLatin();
    } else {
      latin += ch;
    }
  }
  flushLatin();
  return units.map((u) => u).filter((u) => u.length > 0);
}

/** Convert ASS colour &HAABBGGRR to the inline \1c form &HBBGGRR& (strip the alpha component) */
function toInlineColour(assColour: string): string {
  const hex = String(assColour || "").replace(/^&H/i, "").replace(/&$/, "");
  const bgrr = hex.length >= 8 ? hex.slice(2) : hex;
  return `&H${bgrr || "FFFFFF"}&`;
}

interface LineCfg {
  baseFs: number;
  primaryC: string; // inline \1c (fill target colour for normal characters)
  accentC: string; // inline \1c (fill target colour for emphasised characters, hot colour)
  emphasize: boolean;
  emphScale: number;
}

/**
 * Build the {\k..} per-character text for a single line: each unit's \k duration (in centiseconds)
 * is proportional to its character count relative to the line total.
 * Units containing digits (prices/discounts/quantities, e.g. 50% / 9.9 / ¥39) are auto-enlarged
 * and highlighted with the accent colour (standard e-commerce viral emphasis technique).
 */
function buildKaraokeLineText(text: string, durationSec: number, cfg: LineCfg): string {
  const units = splitKaraokeUnits(text);
  if (units.length === 0) return "";
  const totalCs = Math.max(1, Math.round(durationSec * 100));
  const lens = units.map((u) => Math.max(u.trim().length, 1));
  const sumLen = lens.reduce((a, b) => a + b, 0);
  let used = 0;
  return units
    .map((u, i) => {
      // last unit absorbs the remainder; when unit count exceeds total centiseconds (very short duration + long narration), the remainder can be negative — clamp to 1 to prevent \k negative values causing out-of-order display
      const k = i === units.length - 1 ? Math.max(1, totalCs - used) : Math.max(1, Math.round((lens[i] / sumLen) * totalCs));
      used += k;
      const emph = cfg.emphasize && /\d/.test(u); // contains digit → price/discount/quantity, apply emphasis
      const fs = emph ? Math.round(cfg.baseFs * cfg.emphScale) : cfg.baseFs;
      const c = emph ? cfg.accentC : cfg.primaryC;
      return `{\\k${k}\\fs${fs}\\1c${c}}${assEscapeText(u)}`;
    })
    .join("");
}

/** Generate the full ASS text (style block + per-character karaoke events). */
export function buildKaraokeAss(lines: KaraokeLine[], opts: KaraokeStyleOpts = {}): string {
  const o = { ...DEFAULTS, ...opts };
  // when MarginV is not explicitly set, raise it to the platform's bottom UI safe zone (avoids the shopping-cart button / progress bar covering subtitles)
  if (opts.marginV === undefined) o.marginV = karaokeSafeMarginV(o.playResY);
  const outline = Math.max(2, Math.round(o.fontSize * 0.07));
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${o.playResX}`,
    `PlayResY: ${o.playResY}`,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: K,${o.fontName},${o.fontSize},${o.primaryColour},${o.secondaryColour},${o.outlineColour},&H64000000,1,0,0,0,100,100,0,0,1,${outline},1,2,60,60,${o.marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const cfg: LineCfg = {
    baseFs: o.fontSize,
    primaryC: toInlineColour(o.primaryColour),
    accentC: toInlineColour(o.accentColour),
    emphasize: o.emphasizeNumbers !== false,
    emphScale: 1.35,
  };
  const events = (lines || [])
    .filter((l) => l && l.text && l.endTime > l.startTime)
    .map((l) => {
      const body = buildKaraokeLineText(l.text, l.endTime - l.startTime, cfg);
      return `Dialogue: 0,${toAssTime(l.startTime)},${toAssTime(l.endTime)},K,,0,0,0,,${body}`;
    });
  return header.concat(events).join("\n") + "\n";
}

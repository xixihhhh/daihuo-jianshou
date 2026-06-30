/**
 * Image-card carousel — turn a script into a set of styled image cards (a title card + one card per
 * shot's key line) for image-first platforms like Xiaohongshu (小红书 图文笔记), where carousels often
 * outperform video. Renders gradient-background cards with wrapped, centered text via FFmpeg drawtext,
 * reusing the composer's caption-wrap + escaping. No extra dependencies.
 */

import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { ffmpegBin } from "@/lib/ffmpeg-path";
import { buildDrawtext, wrapCaption, resolveChineseFontFile } from "./composer";

export interface CardVfOpts {
  text: string;
  width: number;
  fontFile?: string;
  fontSize?: number;
  fontColor?: string;
}

/** Build the -vf drawtext filter for one card: wrap the text to the card width, centered. Pure; reuses wrapCaption + buildDrawtext. */
export function buildCardVf(o: CardVfOpts): string {
  const fontSize = o.fontSize ?? Math.round(o.width * 0.055);
  const wrapped = wrapCaption(o.text, fontSize, o.width); // multi-line text with embedded newlines
  return buildDrawtext({
    fontFile: o.fontFile,
    text: wrapped,
    fontSize,
    fontColor: o.fontColor ?? "white",
    borderW: Math.max(2, Math.round(o.width * 0.004)),
    lineSpacing: Math.round(fontSize * 0.4),
    x: "(w-text_w)/2",
    y: "(h-text_h)/2",
  });
}

/** Render a single card: gradient background (lavfi) + drawtext overlay → PNG at outPath. */
export async function generateCard(o: {
  text: string;
  outPath: string;
  width: number;
  height: number;
  fontFile?: string;
  fontSize?: number;
  gradient?: [string, string];
}): Promise<void> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const run = promisify(execFile);
  const [c0, c1] = o.gradient ?? ["0x0b0b12", "0x2a1248"];
  const vf = buildCardVf({ text: o.text, width: o.width, fontFile: o.fontFile, fontSize: o.fontSize });
  await mkdir(dirname(o.outPath), { recursive: true });
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `gradients=s=${o.width}x${o.height}:c0=${c0}:c1=${c1}:x0=0:y0=0:x1=${o.width}:y1=${o.height}`,
    "-vf",
    vf,
    "-frames:v",
    "1",
    o.outPath,
  ]);
}

/** Maximum cards per carousel (Xiaohongshu allows up to ~18 images; cap conservatively). */
const MAX_CARDS = 12;

/**
 * Generate a carousel: a title card (large) + one content card per shot's voiceover (numbered).
 * Returns the written file paths in order.
 */
export async function generateCarousel(o: {
  title: string;
  shots: Array<{ voiceover?: string }>;
  outDir: string;
  prefix: string;
  width: number;
  height: number;
  fontFile?: string;
}): Promise<string[]> {
  const fontFile = o.fontFile ?? resolveChineseFontFile();
  const paths: string[] = [];

  // title card — larger font, centered
  const titlePath = join(o.outDir, `${o.prefix}-0.png`);
  await generateCard({ text: o.title, outPath: titlePath, width: o.width, height: o.height, fontFile, fontSize: Math.round(o.width * 0.085) });
  paths.push(titlePath);

  // content cards — one per non-empty voiceover, numbered
  let idx = 1;
  for (const shot of o.shots) {
    if (idx > MAX_CARDS) break;
    const text = (shot.voiceover ?? "").trim();
    if (!text) continue;
    const p = join(o.outDir, `${o.prefix}-${idx}.png`);
    await generateCard({ text: `${idx}. ${text}`, outPath: p, width: o.width, height: o.height, fontFile });
    paths.push(p);
    idx++;
  }
  return paths;
}

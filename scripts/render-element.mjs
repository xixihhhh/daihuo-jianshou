#!/usr/bin/env node
/**
 * Optional motion-element renderer — uses Remotion to render an animated title card or
 * word-by-word kinetic caption into an mp4, for smooth effects (spring-in / scale / glow)
 * that FFmpeg drawtext cannot produce. The rendered clip can be added to the project asset
 * pool or used as an intro / outro.
 *
 * opt-in: Remotion dependencies are not included by default (avoids adding ~300 MB for everyone).
 * Install before use:
 *   npm i remotion @remotion/cli react react-dom
 *
 * Usage:
 *   node scripts/render-element.mjs --kind title --text "在家手冲 三步搞定" --subtitle "COFFEE" --out intro.mp4
 *   node scripts/render-element.mjs --kind caption --text "买它 真的 好用" --aspect 9:16 --duration 3 --out cap.mp4
 *   [--aspect 9:16|16:9|1:1] [--duration seconds]
 */
import { execFileSync } from "child_process";
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function parseArgs(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) continue;
    const k = t.slice(2);
    const n = argv[i + 1];
    if (n !== undefined && !n.startsWith("--")) {
      f[k] = n;
      i++;
    } else f[k] = true;
  }
  return f;
}

const f = parseArgs(process.argv.slice(2));
const kind = f.kind === "caption" ? "caption" : "title";
const text = typeof f.text === "string" ? f.text : "";
const out = typeof f.out === "string" ? f.out : "";
if (!text || !out) {
  process.stderr.write(
    '用法: node scripts/render-element.mjs --kind title|caption --text "..." --out element.mp4 [--subtitle "..."] [--aspect 9:16|16:9|1:1] [--duration 2.5]\n',
  );
  process.exit(1);
}

const DIMS = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080] };
const [width, height] = DIMS[f.aspect] || DIMS["9:16"];
const fps = 30;
const durationInFrames = Math.max(15, Math.round((Number(f.duration) || 2.5) * fps));
const props = { text, subtitle: typeof f.subtitle === "string" ? f.subtitle : "", width, height, durationInFrames };

const propsFile = join(mkdtempSync(join(tmpdir(), "cf-remotion-")), "props.json");
writeFileSync(propsFile, JSON.stringify(props));
const composition = kind === "caption" ? "KineticCaption" : "TitleCard";

try {
  execFileSync("npx", ["remotion", "render", "remotion/index.ts", composition, out, `--props=${propsFile}`, "--log=error"], {
    stdio: "inherit",
  });
  process.stdout.write(`✓ 已渲染动效元素 → ${out}\n`);
} catch (e) {
  process.stderr.write(
    `渲染失败。请先安装可选 Remotion 依赖：npm i remotion @remotion/cli react react-dom\n原始错误：${e?.message || e}\n`,
  );
  process.exit(1);
}

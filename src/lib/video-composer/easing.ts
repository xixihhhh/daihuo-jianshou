/**
 * 运镜缓动 —— 产出 FFmpeg zoompan 可用的表达式。
 *
 * 匀速运镜（线性 zoom）显廉价；ease-out（快进慢出）让镜头有「减速到位」的导演感。
 * 纯字符串构造，可单测。
 */

export type Easing = "linear" | "easeOut" | "easeIn" | "easeInOut";

/** 把进度 p(0..1 的表达式) 按缓动映射成 0..1 的 FFmpeg 表达式 */
export function easeExpr(p: string, easing: Easing): string {
  switch (easing) {
    case "easeOut":
      return `(1-pow(1-${p},2))`; // 二次缓出：快进慢出
    case "easeIn":
      return `pow(${p},2)`; // 二次缓入：慢进快出
    case "easeInOut":
      return `(if(lt(${p},0.5),2*pow(${p},2),1-pow(-2*${p}+2,2)/2))`;
    case "linear":
    default:
      return `(${p})`;
  }
}

/**
 * 在帧区间内按缓动从 v0 插值到 v1，返回 FFmpeg 表达式（用 zoompan 的 on 帧变量驱动）。
 * 例：interpolate("on", 90, 1, 1.5, "easeOut") → zoom 在 90 帧内由 1 缓出到 1.5。
 */
export function interpolate(frameVar: string, frames: number, v0: number, v1: number, easing: Easing = "linear"): string {
  const f = Math.max(1, frames);
  const p = `(${frameVar}/${f})`;
  return `(${v0}+(${v1 - v0})*${easeExpr(p, easing)})`;
}

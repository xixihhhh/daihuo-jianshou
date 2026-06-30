/**
 * Camera motion easing — produces expressions usable in FFmpeg zoompan.
 *
 * Constant-speed motion (linear zoom) looks cheap; ease-out (fast start, slow stop)
 * gives the shot a "deceleration to rest" cinematic feel.
 * Pure string construction; unit-testable.
 */

export type Easing = "linear" | "easeOut" | "easeIn" | "easeInOut";

/** Map progress p (an expression in 0..1) to a 0..1 FFmpeg expression according to the chosen easing */
export function easeExpr(p: string, easing: Easing): string {
  switch (easing) {
    case "easeOut":
      return `(1-pow(1-${p},2))`; // quadratic ease-out: fast start, slow finish
    case "easeIn":
      return `pow(${p},2)`; // quadratic ease-in: slow start, fast finish
    case "easeInOut":
      return `(if(lt(${p},0.5),2*pow(${p},2),1-pow(-2*${p}+2,2)/2))`;
    case "linear":
    default:
      return `(${p})`;
  }
}

/**
 * Interpolate from v0 to v1 over a frame interval using the given easing, returning an FFmpeg expression
 * driven by zoompan's `on` frame variable.
 * Example: interpolate("on", 90, 1, 1.5, "easeOut") → zoom eases out from 1 to 1.5 over 90 frames.
 */
export function interpolate(frameVar: string, frames: number, v0: number, v1: number, easing: Easing = "linear"): string {
  const f = Math.max(1, frames);
  const p = `(${frameVar}/${f})`;
  return `(${v0}+(${v1 - v0})*${easeExpr(p, easing)})`;
}

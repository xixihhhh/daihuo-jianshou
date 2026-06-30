/**
 * Subtitle safe zone (2026 vertical e-commerce standard)
 *
 * In portrait short-video platforms such as TikTok / Douyin / Reels / Shorts, the bottom of the frame
 * is occupied by platform UI (video description, username, shopping-cart button, like/comment bar, progress bar).
 * Subtitles that fall into this zone are physically obscured by platform controls — yet the entire value of
 * burned-in subtitles is to serve the ~85–93% of viewers watching on mute, so an obscured subtitle is wasted work.
 *
 * This module raises the subtitle bottom edge above the UI zone.  In e-commerce mode the bottom of the frame uses
 * a "product card above, subtitle below" stack:
 * product card bottom clearance 0.25 (composer.ts `cardY = height - thumb - height*0.25`, card bottom at h*0.75),
 * subtitle bottom edge at h*0.83 (clearance 0.17), immediately below the card with no overlap.
 * 0.17 is the maximum bottom clearance for the subtitle in this "card above, subtitle below" stack
 * (any higher and a two-line subtitle would collide with the card).
 *
 * ⚠️ 2026 measurements: various TikTok guidelines put the bottom UI zone at ~20–25%
 * (OpusClip subtitle guide recommends keeping subtitles out of the bottom 25%), which is higher than the 0.17 here.
 * In e-commerce mode the subtitle is "pinned" to 0.17 by the product card — to truly clear the 25% UI zone
 * the layout would need to be inverted ("subtitle above, card below"), which is a subjective design trade-off
 * for the user to decide.  Videos without a product card are not constrained in the same way; their subtitle
 * clearance could be raised to 0.20+ (not yet conditionalised — uniformly 0.17 for now).
 *
 * Pure functions for deterministic unit testing (no ffmpeg required).
 */

/** bottom safe clearance ratio: subtitle bottom edge must be at least this fraction above the frame bottom to clear the platform UI zone (in e-commerce mode, pinned to this upper limit by the product card stack at 0.25) */
export const CAPTION_SAFE_BOTTOM_RATIO = 0.17;

/**
 * Subtitle bottom clearance when no product card is present: pure topic videos / cardless e-commerce videos
 * have no "card above, subtitle below" stacking constraint, so subtitles can be raised to better clear
 * the 2026 platform bottom UI zone (various guidelines: ~20–25%).
 * Set to 0.22: clears the broadly agreed 20% UI zone with headroom, without moving too far into the frame;
 * stricter subtitle-specific guides (avoid the bottom 25%) would suggest 0.25, but 0.22 balances
 * "clear the UI" against "don't intrude too much into the picture".
 * E-commerce videos with a product card still use 0.17 (see the constraint described in that constant's comment).
 */
export const CAPTION_SAFE_BOTTOM_RATIO_NOCARD = 0.22;

/** MarginV for karaoke ASS (pixels from the bottom edge in PlayRes coordinate space): playResY × safe clearance ratio */
export function karaokeSafeMarginV(playResY: number): number {
  return Math.round(playResY * CAPTION_SAFE_BOTTOM_RATIO);
}

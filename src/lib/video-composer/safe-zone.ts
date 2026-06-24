/**
 * 字幕安全区（2026 竖屏带货标配）
 *
 * TikTok / 抖音 / Reels / Shorts 等竖屏短视频，画面底部约 17% 被平台 UI 占据
 * （视频描述、账号名、购物车/小黄车、点赞评论列、进度条）。字幕若落进这一区会被
 * 平台控件物理遮挡——而烧录字幕的全部价值正是服务 ~85% 的静音观看人群，被遮挡等于白做。
 *
 * 本模块把字幕基线统一抬到该 UI 区之上，取值与商品卡现有的 0.17 底部留白
 * （composer.ts「cardY = height - thumb - height*0.17，避开底部字幕区」）对齐——
 * 即字幕底边与商品卡底边同高，既避让平台 UI，又保持画面底部基线整齐。
 *
 * 纯函数，便于确定性单测（无需跑 ffmpeg）。
 */

/** 底部安全留白比例：字幕底边距画面底 ≥ 该比例，避开平台底部 UI 区（与商品卡 0.17 一致） */
export const CAPTION_SAFE_BOTTOM_RATIO = 0.17;

/** 卡拉OK ASS 的 MarginV（距底边像素，PlayRes 坐标系）：playResY × 安全比例 */
export function karaokeSafeMarginV(playResY: number): number {
  return Math.round(playResY * CAPTION_SAFE_BOTTOM_RATIO);
}

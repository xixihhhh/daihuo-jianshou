/**
 * 效果回流：把「发布后人工录入的各条数据」聚合成「哪种脚本风格更能卖」的洞察，反哺生成。
 * 带货最关心转化（成交/播放），其次互动（赞评转/播放）。纯函数、可单测；DB/UI 在外层。
 */

/** 单条投放数据（DB 行的最小子集，聚合只需这些） */
export interface MetricInput {
  /** 脚本风格 key（pain_point/scene/comparison/story/custom），录入时定格 */
  style: string;
  views: number;
  likes?: number;
  comments?: number;
  shares?: number;
  /** 成交单数 */
  orders?: number;
}

export interface StyleInsight {
  style: string;
  /** 样本数（发了几条这种风格） */
  samples: number;
  avgViews: number;
  /** 互动率 (赞+评+转)/播放，0..1 */
  engagementRate: number;
  /** 转化率 成交/播放，0..1 */
  conversionRate: number;
  totalOrders: number;
}

const sum = (rs: MetricInput[], f: (r: MetricInput) => number) => rs.reduce((a, r) => a + (f(r) || 0), 0);

/** 按脚本风格聚合，按转化率降序（带货优先「能不能卖」），并列按样本数 */
export function aggregateByStyle(records: MetricInput[]): StyleInsight[] {
  const groups = new Map<string, MetricInput[]>();
  for (const r of records) {
    const g = groups.get(r.style);
    if (g) g.push(r);
    else groups.set(r.style, [r]);
  }
  const out: StyleInsight[] = [];
  for (const [style, rs] of groups) {
    const samples = rs.length;
    const totalViews = sum(rs, (r) => r.views);
    const totalEng = sum(rs, (r) => (r.likes || 0) + (r.comments || 0) + (r.shares || 0));
    const totalOrders = sum(rs, (r) => r.orders || 0);
    out.push({
      style,
      samples,
      avgViews: Math.round(totalViews / samples),
      engagementRate: totalViews > 0 ? totalEng / totalViews : 0,
      conversionRate: totalViews > 0 ? totalOrders / totalViews : 0,
      totalOrders,
    });
  }
  return out.sort((a, b) => b.conversionRate - a.conversionRate || b.samples - a.samples);
}

/**
 * 推荐「最能卖」的风格：需达到最小样本数（默认 2，避免单条偶然），且转化率 > 0。
 * 返回 null 表示数据不足，别给误导性建议。
 */
export function topConvertingStyle(records: MetricInput[], minSamples = 2): StyleInsight | null {
  const ranked = aggregateByStyle(records).filter((i) => i.samples >= minSamples && i.conversionRate > 0);
  return ranked[0] ?? null;
}

import { NextRequest, NextResponse } from "next/server";
import { fetchTrendingTopics, normalizeGeo } from "@/lib/trends";

/**
 * GET /api/trends?geo=US —— 拉某地区每日热搜，建议「该做什么主题」（可直接当一句话成片的 topic）。
 * 免 Key；地区非法回退 US；拉取失败返回空列表不报错。
 */
export async function GET(req: NextRequest) {
  const geo = normalizeGeo(new URL(req.url).searchParams.get("geo"));
  const topics = await fetchTrendingTopics(geo, { limit: 20 });
  return NextResponse.json({ geo, count: topics.length, topics });
}

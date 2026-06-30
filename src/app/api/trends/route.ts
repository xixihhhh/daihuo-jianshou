import { NextRequest, NextResponse } from "next/server";
import { fetchTrendingTopics, normalizeGeo } from "@/lib/trends";

/**
 * GET /api/trends?geo=US —— fetch daily trending searches for a region and suggest topics (suitable as a one-sentence topic for video generation).
 * No API key required; invalid geo falls back to US; fetch failure returns an empty list without throwing.
 */
export async function GET(req: NextRequest) {
  const geo = normalizeGeo(new URL(req.url).searchParams.get("geo"));
  const topics = await fetchTrendingTopics(geo, { limit: 20 });
  return NextResponse.json({ geo, count: topics.length, topics });
}

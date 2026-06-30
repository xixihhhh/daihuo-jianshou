import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { publishMetrics } from "@/lib/db/schema";
import { aggregateByStyle, aggregateByHook } from "@/lib/performance-insights";

/**
 * GET /api/insights/styles — aggregate publish metrics across all projects to determine which style sells best and which hook mechanism converts best.
 * Results are sorted by conversion rate (orders/views) descending, for use in the export page/dashboard and to feed back into script/hook generation.
 */
export async function GET() {
  const db = getDb();
  const rows = await db.select().from(publishMetrics);
  const records = rows.map((r) => ({
    style: r.style,
    hookId: r.hookId ?? undefined,
    views: r.views,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    orders: r.orders,
  }));
  return NextResponse.json({
    insights: aggregateByStyle(records),
    hookInsights: aggregateByHook(records),
    total: rows.length,
  });
}

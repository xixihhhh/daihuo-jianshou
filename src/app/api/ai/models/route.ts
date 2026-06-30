import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/providers";
import type { MediaType, Model } from "@/lib/providers/types";

/**
 * Aggregates the available model list from all enabled providers.
 * Used by the frontend (settings page default model selector, asset/video generation entry points)
 * to fetch and display selectable models.
 *
 * Request body:
 *   { providers: [{ name, apiKey?, baseUrl? }], mediaType?: 'image' | 'video' }
 * Response:
 *   { models: Model[] }  // aggregated by provider
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const providers = (body.providers ?? []) as Array<{
    name: string;
    apiKey?: string;
    baseUrl?: string;
  }>;
  const mediaType = body.mediaType as MediaType | undefined;

  if (!Array.isArray(providers) || providers.length === 0) {
    return NextResponse.json({ models: [] });
  }

  // Fetch each provider's model list concurrently; a failure from one provider does not affect the others
  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const provider = createProvider({
        name: p.name,
        apiKey: p.apiKey ?? "",
        baseUrl: p.baseUrl ?? "",
      });
      return provider.listModels(mediaType);
    })
  );

  const models: Model[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      models.push(...r.value);
    } else {
      console.warn(`获取 ${providers[i]?.name} 模型列表失败:`, r.reason);
    }
  });

  return NextResponse.json({ models });
}

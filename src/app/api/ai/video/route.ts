import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/providers";

// AI 生视频
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider: providerName, model, prompt, imageUrl, mode, apiKey, baseUrl, options } = body;

  if (!providerName || !model) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  try {
    const provider = createProvider({ name: providerName, apiKey, baseUrl });

    const result = await provider.generateVideo({
      modelId: model,
      mode: mode || (imageUrl ? "image-to-video" : "text-to-video"),
      prompt: prompt || "",
      firstFrameUrl: imageUrl,
      ...options,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("生视频失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生视频失败" },
      { status: 500 }
    );
  }
}

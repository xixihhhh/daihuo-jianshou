import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/providers";

// 查询 AI 任务状态（生图/生视频是异步的）
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider: providerName, taskId, apiKey, baseUrl } = body;

  if (!providerName || !taskId) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  try {
    const provider = createProvider({ name: providerName, apiKey, baseUrl });
    const status = await provider.getTaskStatus(taskId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("查询任务状态失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

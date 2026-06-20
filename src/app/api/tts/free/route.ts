import { NextRequest, NextResponse } from "next/server";
import { generateSpeechFree, FREE_TTS_VOICES, DEFAULT_FREE_VOICE } from "@/lib/edge-tts";

// GET /api/tts/free —— 列出可用的免费音色（无需任何 Key）
export async function GET() {
  return NextResponse.json({ voices: FREE_TTS_VOICES, default: DEFAULT_FREE_VOICE });
}

// POST /api/tts/free —— 试听：用微软 Edge keyless TTS 合成一小段语音，直接返回 mp3
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* 允许空 body，用默认试听词 */
  }
  const text = (typeof body.text === "string" && body.text.trim()) || "你好，这是免费配音的试听效果。";
  const voice = typeof body.voice === "string" ? body.voice : DEFAULT_FREE_VOICE;
  const rate = typeof body.rate === "string" ? body.rate : undefined;

  try {
    const audio = await generateSpeechFree(text.slice(0, 200), { voice, rate });
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "免费配音生成失败" },
      { status: 502 }
    );
  }
}

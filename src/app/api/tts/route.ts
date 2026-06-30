import { NextRequest, NextResponse } from "next/server";
import { generateSpeech, type TTSConfig } from "@/lib/tts";

// TTS voice preview: return mp3 audio bytes for the frontend to preview a voice
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, ttsConfig } = body as { text?: string; ttsConfig?: TTSConfig };

    if (!text) {
      return NextResponse.json({ error: "缺少配音文本" }, { status: 400 });
    }
    if (!ttsConfig?.baseUrl || !ttsConfig?.apiKey || !ttsConfig?.model || !ttsConfig?.voice) {
      return NextResponse.json(
        { error: "请先在设置中配置 TTS（baseUrl、apiKey、model、voice）" },
        { status: 400 }
      );
    }

    const audio = await generateSpeech(text, ttsConfig);
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS 失败" },
      { status: 500 }
    );
  }
}

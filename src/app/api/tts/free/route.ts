import { NextRequest, NextResponse } from "next/server";
import { generateSpeechFree, FREE_TTS_VOICES, DEFAULT_FREE_VOICE } from "@/lib/edge-tts";

// GET /api/tts/free —— list available free voices (no API key required)
export async function GET() {
  return NextResponse.json({ voices: FREE_TTS_VOICES, default: DEFAULT_FREE_VOICE });
}

// POST /api/tts/free —— preview: synthesize a short audio clip using Microsoft Edge keyless TTS and return it as mp3
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body; use default preview text */
  }
  const text = (typeof body.text === "string" && body.text.trim()) || "你好，这是免费配音的试听效果。";
  // validate that the voice name contains only safe characters (Edge voices look like en-US-AriaNeural; hyphens allowed, compatible with any valid Edge voice rather than a fixed allowlist) — fall back to default on invalid input to prevent SSML injection
  const voice = typeof body.voice === "string" && /^[A-Za-z0-9-]{1,40}$/.test(body.voice) ? body.voice : DEFAULT_FREE_VOICE;
  // rate must be in SSML prosody rate format (e.g. +10% / -5%) — omit on invalid input to prevent SSML injection
  const rate = typeof body.rate === "string" && /^[+-]?\d{1,3}%$/.test(body.rate) ? body.rate : undefined;

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

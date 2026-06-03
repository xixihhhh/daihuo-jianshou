/**
 * 测试 Agnes API 连通性
 * 访问: /api/test/agnes
 */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get('key');
  const testEndpoint = searchParams.get('endpoint') || 'image';

  if (!apiKey) {
    return NextResponse.json({ error: '需要传 ?key=YOUR_API_KEY' }, { status: 400 });
  }

  const results: any[] = [];

  // 测试1：图片生成（OpenAI 兼容）
  try {
    const imgRes = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'agnes-image-2.1-flash',
        prompt: 'a red apple',
        n: 1,
      }),
    });
    const imgData = await imgRes.json().catch(() => null);
    results.push({
      endpoint: 'images/generations',
      url: 'https://apihub.agnes-ai.com/v1/images/generations',
      status: imgRes.status,
      data: imgData,
    });
  } catch (e: any) {
    results.push({ endpoint: 'images/generations', error: e.message });
  }

  // 测试2：视频创建任务
  try {
    const vidRes = await fetch('https://apihub.agnes-ai.com/v1/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'agnes-video-v2.0',
        prompt: 'test',
        num_frames: 121,
        frame_rate: 24,
      }),
    });
    const vidData = await vidRes.json().catch(() => null);
    results.push({
      endpoint: 'videos (create)',
      url: 'https://apihub.agnes-ai.com/v1/videos',
      status: vidRes.status,
      data: vidData,
    });
  } catch (e: any) {
    results.push({ endpoint: 'videos (create)', error: e.message });
  }

  return NextResponse.json({ results });
}

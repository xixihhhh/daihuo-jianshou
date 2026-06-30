import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { scripts as scriptsTable, projects, type Shot } from "@/lib/db/schema";
import { translateShots, defaultVoiceForLang, langName } from "@/lib/script-engine/translate";

const SAFE_ID = /^[a-zA-Z0-9\-]+$/;

/**
 * POST /api/project/[id]/dub —— 把当前选中脚本翻成目标语种，存为新选中脚本版本（译制版）。
 * 之后用返回的 recommendedVoice 走正常 compose，即得换语种配音版（出海：同片发不同市场）。
 * 画面检索字段保持原文，译制版沿用同样画面，只换声音/字幕。
 * body: { targetLang: string, llmConfig: {baseUrl,apiKey,model}, title? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !SAFE_ID.test(id)) return NextResponse.json({ error: "无效的项目ID" }, { status: 400 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* 允许空 body，下面校验 */
  }
  const targetLang = typeof body.targetLang === "string" ? body.targetLang.trim() : "";
  if (!targetLang) return NextResponse.json({ error: "请指定 targetLang（如 en/ja/ko/es）" }, { status: 400 });
  const llmConfig = body.llmConfig as { baseUrl?: string; apiKey?: string; model?: string } | undefined;
  if (!llmConfig?.baseUrl || !llmConfig?.model) {
    return NextResponse.json({ error: "请配置 LLM 参数（baseUrl、model；本地/免费端点 apiKey 可留空）" }, { status: 400 });
  }

  const db = getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

  const rows = await db.select().from(scriptsTable).where(eq(scriptsTable.projectId, id));
  if (!rows.length) return NextResponse.json({ error: "该项目还没有脚本" }, { status: 404 });
  const source = rows.find((r) => r.selected) ?? rows[rows.length - 1];
  const shots = (source.shots ?? []) as Shot[];
  if (!shots.length) return NextResponse.json({ error: "脚本没有分镜" }, { status: 400 });

  let translated: Shot[];
  try {
    translated = await translateShots(shots, targetLang, {
      baseUrl: llmConfig.baseUrl,
      apiKey: llmConfig.apiKey ?? "",
      model: llmConfig.model,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "翻译失败" }, { status: 502 });
  }
  const totalDuration = translated.reduce((sum, sh) => sum + sh.duration, 0);

  // 取下一版本号；旧脚本取消选中，译制版设为当前
  const [latest] = await db
    .select({ version: scriptsTable.version })
    .from(scriptsTable)
    .where(eq(scriptsTable.projectId, id))
    .orderBy(desc(scriptsTable.version))
    .limit(1);
  const nextVersion = (latest?.version ?? 0) + 1;
  await db.update(scriptsTable).set({ selected: false }).where(eq(scriptsTable.projectId, id));

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 80)
      : `[${langName(targetLang)}] ${source.title ?? "dub"}`.slice(0, 80);

  const [row] = await db
    .insert(scriptsTable)
    .values({ projectId: id, version: nextVersion, styleType: "custom", title, totalDuration, shots: translated, selected: true })
    .returning();

  return NextResponse.json({
    scriptId: row.id,
    version: nextVersion,
    targetLang,
    shots: translated.length,
    recommendedVoice: defaultVoiceForLang(targetLang),
  });
}

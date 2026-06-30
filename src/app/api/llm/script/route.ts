import { NextRequest, NextResponse } from "next/server";
import { getDataDir } from "@/lib/paths";
import { readFile } from "fs/promises";
import { join } from "path";
import { generateScript, analyzeProduct } from "@/lib/script-engine/generator";
import type { ScriptStyleType } from "@/lib/script-engine/prompts";
import type { ProductCategory } from "@/lib/script-engine/templates";
import { getDb } from "@/lib/db";
import { scripts as scriptsTable, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Allowed enum values for the styleType column in the scripts table */
const VALID_SCRIPT_STYLE = new Set(["pain_point", "scene", "comparison", "story", "custom"]);

/** Convert a local image path to a base64 data URI for use with LLM vision models */
async function imagePathToBase64(imagePath: string): Promise<string> {
  // Already a full URL or base64 data URI, return as-is
  if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
    return imagePath;
  }

  // Local API path e.g. /api/files/projectId/filename.png
  // Extract the actual file path: data/uploads/projectId/filename.png
  const match = imagePath.match(/\/api\/files\/(.+)/);
  if (!match) return imagePath;

  const relativePath = match[1];
  const filePath = join(getDataDir(), "uploads", relativePath);

  try {
    const buffer = await readFile(filePath);
    const base64 = buffer.toString("base64");
    // Infer MIME type from file extension
    const ext = filePath.split(".").pop()?.toLowerCase() || "png";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
    };
    const mime = mimeMap[ext] || "image/png";
    return `data:${mime};base64,${base64}`;
  } catch {
    console.warn(`无法读取图片文件: ${filePath}`);
    return imagePath;
  }
}

/** Normalize a frontend category value to a ProductCategory supported by the engine */
function normalizeCategory(raw: unknown): ProductCategory {
  const map: Record<string, ProductCategory> = {
    beauty: "beauty",
    food: "food",
    home: "home",
    fashion: "fashion",
    tech: "tech",
    digital: "tech", // frontend uses "digital" for the "Electronics/3C" category
    "3c": "tech",
    other: "beauty", // fallback for uncategorized items
  };
  return map[String(raw ?? "").toLowerCase()] ?? "beauty";
}

/** Normalize a frontend script style value to a ScriptStyleType supported by the engine */
function normalizeStyle(raw: unknown): ScriptStyleType {
  const map: Record<string, ScriptStyleType> = {
    pain_point: "pain_point",
    "pain-point": "pain_point",
    scene: "scene",
    scenario: "scene", // frontend uses "scenario" for the "scene recommendation" style
    comparison: "comparison",
    story: "story",
    custom: "custom",
    auto: "pain_point", // smart-recommend mode defaults to pain-point style
  };
  return map[String(raw ?? "").toLowerCase()] ?? "pain_point";
}

// Generate commerce script
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    productImages,
    productName,
    productDescription,
    llmConfig,
  } = body;

  // Support both frontend field naming conventions: category/productCategory, targetDuration/duration
  const category = normalizeCategory(body.category ?? body.productCategory);
  const styleType = normalizeStyle(body.styleType);
  const duration = body.targetDuration ?? body.duration ?? 30;

  if (!productName) {
    return NextResponse.json({ error: "请填写商品名称" }, { status: 400 });
  }

  if (!llmConfig?.baseUrl || !llmConfig?.apiKey || !llmConfig?.model) {
    return NextResponse.json({ error: "请配置 LLM 参数（baseUrl、apiKey、model）" }, { status: 400 });
  }

  try {
    // Product image analysis: convert local paths to base64 before passing to the vision model
    let analysis = body.productAnalysis;
    if (!analysis && productImages?.length > 0 && llmConfig) {
      try {
        const imageUrls = await Promise.all(
          (productImages as string[]).map(imagePathToBase64)
        );
        analysis = await analyzeProduct(imageUrls, llmConfig);
      } catch (e) {
        // Image analysis failure should not block script generation
        console.warn("商品图片分析失败（已跳过）:", e);
      }
    }

    // Generate script (category/styleType/duration already normalized above)
    const scripts = await generateScript({
      productName,
      category,
      productDescription,
      productAnalysis: analysis,
      styleType,
      targetDuration: duration,
      videoMode: body.videoMode,
      priceRange: body.priceRange,
      platforms: body.platforms,
      usageAdvantage: body.usageAdvantage,
      targetAudience: body.targetAudience,
      referenceStructure: body.referenceStructure,
      llmConfig,
    });

    // Persist: write generated scripts to the scripts table so the script/assets pages can read them by projectId
    let savedScripts = scripts;
    const projectId = body.projectId;
    if (projectId) {
      const db = getDb();
      // Refuse to overwrite a one-liner topic project with a commerce script (contentType mismatch — would delete its topic scripts)
      const proj = await db
        .select({ contentType: projects.contentType })
        .from(projects)
        .where(eq(projects.id, projectId));
      if (proj.length > 0 && proj[0].contentType === "topic") {
        return NextResponse.json(
          { error: "该项目是一句话主题项目，请勿用带货脚本覆盖", projectId },
          { status: 409 }
        );
      }
      try {
        // Delete existing scripts for this project first (overwrite on regenerate)
        await db.delete(scriptsTable).where(eq(scriptsTable.projectId, projectId));
        const rows = await db
          .insert(scriptsTable)
          .values(
            scripts.map((s, i) => ({
              projectId,
              version: 1,
              styleType: (VALID_SCRIPT_STYLE.has(s.styleType) ? s.styleType : "custom") as
                | "pain_point" | "scene" | "comparison" | "story" | "custom",
              title: s.title,
              totalDuration: s.totalDuration,
              shots: s.shots,
              selected: i === 0, // select the first script set by default
            }))
          )
          .returning();
        savedScripts = rows.map((r) => ({
          id: r.id,
          title: r.title ?? "",
          styleType: r.styleType,
          totalDuration: r.totalDuration ?? 0,
          shots: r.shots ?? [],
          selected: r.selected ?? false,
        })) as typeof scripts;
        // Sync project status and analysis result
        await db
          .update(projects)
          .set({ status: "scripting", ...(analysis && { productAnalysis: analysis }), updatedAt: new Date() })
          .where(eq(projects.id, projectId));
      } catch (e) {
        // DB write failure must surface as an error — returning 200 would let the frontend navigate away thinking it succeeded, then read empty scripts from the DB (which may already have had their old scripts deleted)
        console.error("脚本落库失败:", e);
        return NextResponse.json({ error: "脚本落库失败，请重试", projectId }, { status: 500 });
      }
    }

    return NextResponse.json({ scripts: savedScripts, analysis });
  } catch (error) {
    console.error("脚本生成失败:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `脚本生成失败: ${errMsg}` },
      { status: 500 }
    );
  }
}

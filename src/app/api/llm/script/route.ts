import { NextRequest, NextResponse } from "next/server";
import { generateScript, analyzeProduct } from "@/lib/script-engine/generator";
import type { ScriptStyleType } from "@/lib/script-engine/prompts";
import type { ProductCategory } from "@/lib/script-engine/templates";

// 生成带货脚本
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    productImages,
    productName,
    productCategory,
    productDescription,
    styleType,
    duration,
    llmConfig,
  } = body;

  if (!productName) {
    return NextResponse.json({ error: "请填写商品名称" }, { status: 400 });
  }

  if (!llmConfig?.baseUrl || !llmConfig?.apiKey || !llmConfig?.model) {
    return NextResponse.json({ error: "请配置 LLM 参数（baseUrl、apiKey、model）" }, { status: 400 });
  }

  try {
    // 如果有商品图，先用视觉模型分析
    let analysis = body.productAnalysis;
    if (!analysis && productImages?.length > 0 && llmConfig) {
      analysis = await analyzeProduct(productImages, llmConfig);
    }

    // 生成脚本
    const scripts = await generateScript({
      productName,
      category: (productCategory || "beauty") as ProductCategory,
      productDescription,
      productAnalysis: analysis,
      styleType: (styleType || "pain_point") as ScriptStyleType,
      targetDuration: duration || 30,
      llmConfig,
    });

    return NextResponse.json({ scripts, analysis });
  } catch (error) {
    console.error("脚本生成失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "脚本生成失败" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// 允许通过 PATCH 更新的字段白名单（禁止透传 id/createdAt 等，防止字段注入/主键破坏）
const PATCHABLE_FIELDS = [
  "name",
  "productName",
  "productCategory",
  "productDescription",
  "productImages",
  "productAnalysis",
  "productId",
  "brandId",
  "templateId",
  "videoMode",
  "sourceType",
  "sourceVideoUrl",
  "characterId",
  "status",
] as const;

// status 字段的合法枚举值（SQLite 不强制 enum，需手动校验）
const VALID_STATUS = new Set([
  "draft",
  "scripting",
  "assets",
  "video",
  "composing",
  "done",
]);

// 获取单个项目
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const result = await db.select().from(projects).where(eq(projects.id, id));

    if (result.length === 0) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("获取项目失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取项目失败" },
      { status: 500 }
    );
  }
}

// 更新项目
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = getDb();

    // 只取白名单字段，丢弃 id/createdAt 等危险字段
    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // 校验 status 枚举合法性
    if ("status" in updates && !VALID_STATUS.has(String(updates.status))) {
      return NextResponse.json({ error: "非法的项目状态值" }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const result = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("更新项目失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新项目失败" },
      { status: 500 }
    );
  }
}

// 删除项目
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.delete(projects).where(eq(projects.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除项目失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除项目失败" },
      { status: 500 }
    );
  }
}

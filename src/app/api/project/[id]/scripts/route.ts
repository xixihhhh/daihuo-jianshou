import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// Fetch all script variants for a project (the script page / assets page reads real data by projectId)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const rows = await db
      .select()
      .from(scripts)
      .where(eq(scripts.projectId, id))
      .orderBy(desc(scripts.createdAt));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch scripts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取脚本失败" },
      { status: 500 }
    );
  }
}

// Update the selected state of a script (the user switches the active variant on the script page)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const selectedId = body.selectedScriptId as string | undefined;
    if (!selectedId) {
      return NextResponse.json({ error: "缺少 selectedScriptId" }, { status: 400 });
    }
    const db = getDb();
    // Deselect all scripts under this project, then select the target
    const rows = await db.select().from(scripts).where(eq(scripts.projectId, id));
    for (const r of rows) {
      await db
        .update(scripts)
        .set({ selected: r.id === selectedId })
        .where(eq(scripts.id, r.id));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update script selection:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 }
    );
  }
}

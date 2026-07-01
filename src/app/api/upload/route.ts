import { NextRequest, NextResponse } from "next/server";
import { getDataDir } from "@/lib/paths";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/** Whitelist of allowed upload MIME types */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
]);

/** Whitelist of allowed file extensions */
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "svg", "bmp",
]);

/** Maximum size per file (20 MB) */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Upload product images
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "无效的表单数据，请检查上传的文件" }, { status: 400 });
  }
  const files = formData.getAll("files") as File[];
  const projectId = formData.get("projectId") as string;

  if (!files.length) {
    return NextResponse.json({ error: "请上传至少一张图片" }, { status: 400 });
  }

  if (!projectId) {
    return NextResponse.json({ error: "缺少项目ID" }, { status: 400 });
  }

  // Validate projectId to prevent path traversal (only UUID format or alphanumeric-hyphen allowed)
  if (!/^[a-zA-Z0-9\-]+$/.test(projectId)) {
    return NextResponse.json({ error: "无效的项目ID格式" }, { status: 400 });
  }

  // Create upload directory
  const uploadDir = join(getDataDir(), "uploads", projectId);
  await mkdir(uploadDir, { recursive: true });

  const savedPaths: string[] = [];

  for (const file of files) {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件 ${file.name} 超过 20MB 大小限制` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `文件 ${file.name} 类型不支持，仅允许图片文件` },
        { status: 400 }
      );
    }

    // Extract and validate file extension from the original filename (prevent path traversal)
    const rawName = file.name.replace(/[/\\]/g, ""); // strip path separators
    const ext = rawName.split(".").pop()?.toLowerCase() || "jpg";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `文件 ${file.name} 扩展名不支持` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique filename (avoid using the original name for security)
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);
    savedPaths.push(`/api/files/${projectId}/${fileName}`);
  }

  return NextResponse.json({ paths: savedPaths });
}

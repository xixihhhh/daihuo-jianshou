import { NextRequest, NextResponse } from "next/server";
import { getDataDir } from "@/lib/paths";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/** Allowlist of permitted upload MIME types */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
]);

/** Allowlist of permitted file extensions */
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "svg", "bmp",
]);

/** Maximum size per file (20 MB) */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Upload product-library images: not tied to a project; written to disk at data/uploads/products/<productId>/ by productId.
// The returned /api/files/products/... path is served by the existing static-file route and stays valid across page reloads and navigation (replacing short-lived blob: URLs).
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  const productId = formData.get("productId") as string;

  if (!files.length) {
    return NextResponse.json({ error: "请上传至少一张图片" }, { status: 400 });
  }

  if (!productId) {
    return NextResponse.json({ error: "缺少商品ID" }, { status: 400 });
  }

  // Validate productId to prevent path traversal (only UUID format or alphanumeric hyphens allowed)
  if (!/^[a-zA-Z0-9\-]+$/.test(productId)) {
    return NextResponse.json({ error: "无效的商品ID格式" }, { status: 400 });
  }

  // Product images are stored under uploads/products/<productId>/, isolated from the per-project upload directories
  const uploadDir = join(getDataDir(), "uploads", "products", productId);
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

    // Extract and validate the extension from the original filename (prevent path traversal)
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

    // Generate a unique filename (do not use the original filename to avoid security issues)
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);
    savedPaths.push(`/api/files/products/${productId}/${fileName}`);
  }

  return NextResponse.json({ paths: savedPaths });
}

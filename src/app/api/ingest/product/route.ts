import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getUploadsDir } from "@/lib/paths";
import { mkdir, writeFile } from "fs/promises";
import { join, basename } from "path";
import { parseProductFromHtml } from "@/lib/product-ingest";
import { inferExtension, MAX_DOWNLOAD_BYTES } from "@/lib/providers/stock-types";
import { safeFetch } from "@/lib/ssrf-guard";

const UA = "Mozilla/5.0 (compatible; ClipForge/1.0; +https://github.com/xixihhhh/clipforge)";
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES = 3;

/** Download a single product image to local disk with SSRF protection (safeFetch validates each redirect hop to block og:image pointing to internal addresses). */
async function safeDownloadImage(url: string, destDir: string, base: string): Promise<string> {
  const res = await safeFetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`图片下载失败 ${res.status}`);
  const ct = res.headers.get("content-type");
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared && declared > MAX_DOWNLOAD_BYTES) throw new Error("图片体积超限");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_DOWNLOAD_BYTES) throw new Error("图片体积超限");
  const filePath = join(destDir, `${base}.${inferExtension(url, ct, "image")}`);
  await writeFile(filePath, buf);
  return filePath;
}

/**
 * POST /api/ingest/product — one-click product link import.
 * body: { url, createProject? } (createProject defaults to true: create a commerce project + download the first 3 product images)
 * Fetch product page → parse title/price/description/images → (optionally) persist as a project; the frontend/MCP can then use the projectId to go straight to script → video generation.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\/.+/i.test(url)) {
    return NextResponse.json({ error: "请填写合法的商品链接（http/https）" }, { status: 400 });
  }
  const createProject = body.createProject !== false;

  // Fetch HTML (descriptive UA + timeout + size cap)
  let html: string;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    // safeFetch: blocks internal/metadata addresses + validates each redirect hop (SSRF prevention)
    const res = await safeFetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return NextResponse.json({ error: `抓取商品页失败：HTTP ${res.status}` }, { status: 502 });
    const ct = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ct)) {
      return NextResponse.json({ error: "该链接不是网页（非 HTML），无法解析" }, { status: 415 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    html = buf.subarray(0, MAX_HTML_BYTES).toString("utf8");
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "抓取超时" : e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `抓取商品页失败：${msg}` }, { status: 502 });
  }

  const product = parseProductFromHtml(html, url);
  if (!product.title && product.images.length === 0) {
    return NextResponse.json({ error: "没能从该链接解析出商品信息，请改用手动填写", product }, { status: 422 });
  }

  if (!createProject) return NextResponse.json({ product });

  // Create a commerce project + download the first few product images and persist them
  const db = getDb();
  const name = (product.title || "导入的商品").slice(0, 60);
  const [proj] = await db
    .insert(projects)
    .values({
      name,
      contentType: "product",
      productName: name,
      productDescription: product.description ?? null,
      productPrice: product.priceText ?? null,
      productImages: [],
    })
    .returning();

  const destDir = join(getUploadsDir(), proj.id);
  await mkdir(destDir, { recursive: true });
  const saved: string[] = [];
  for (const [i, img] of product.images.slice(0, MAX_IMAGES).entries()) {
    try {
      const filePath = await safeDownloadImage(img, destDir, `ingest_${Date.now()}_${i}`);
      saved.push(`/api/files/${proj.id}/${basename(filePath)}`);
    } catch {
      /* Skip images that fail to download or are blocked by SSRF protection */
    }
  }
  if (saved.length > 0) {
    await db.update(projects).set({ productImages: saved, updatedAt: new Date() }).where(eq(projects.id, proj.id));
  }

  return NextResponse.json({ projectId: proj.id, product, productImages: saved });
}

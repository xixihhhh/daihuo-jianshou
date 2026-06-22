import { describe, it, expect } from "vitest";
import {
  parseProductFromHtml,
  decodeEntities,
  getMeta,
  toAbsolute,
  extractJsonLdProduct,
} from "@/lib/product-ingest";

describe("product-ingest helpers", () => {
  it("decodeEntities 解码常见实体并归一空白", () => {
    expect(decodeEntities("A &amp; B&#39;s  caf&#xe9;")).toBe("A & B's café");
  });
  it("getMeta 兼容 property/name 与属性顺序", () => {
    expect(getMeta(`<meta property="og:title" content="Hi">`, ["og:title"])).toBe("Hi");
    expect(getMeta(`<meta content="Yo" name="twitter:title">`, ["twitter:title"])).toBe("Yo");
  });
  it("toAbsolute 解析相对路径", () => {
    expect(toAbsolute("/img/a.jpg", "https://shop.com/p/1")).toBe("https://shop.com/img/a.jpg");
    expect(toAbsolute("https://cdn.com/x.jpg", "https://shop.com")).toBe("https://cdn.com/x.jpg");
  });
});

describe("parseProductFromHtml", () => {
  it("JSON-LD Product 优先：取 name/价格(带币种)/描述/图片", () => {
    const html = `<html><head><title>Store</title>
      <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "云柔加厚抽纸",
        description: "3层加厚，囤货必备",
        image: ["https://cdn.shop.com/a.jpg", "https://cdn.shop.com/b.jpg"],
        offers: { "@type": "Offer", price: "39.9", priceCurrency: "CNY" },
      })}</script></head><body></body></html>`;
    const p = parseProductFromHtml(html, "https://shop.com/p/1");
    expect(p.title).toBe("云柔加厚抽纸");
    expect(p.priceText).toBe("¥39.9");
    expect(p.description).toContain("囤货必备");
    expect(p.images).toEqual(["https://cdn.shop.com/a.jpg", "https://cdn.shop.com/b.jpg"]);
  });

  it("JSON-LD 在 @graph 数组里也能找到 Product", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@graph": [{ "@type": "WebSite" }, { "@type": "Product", name: "X", offers: { price: 5.9, priceCurrency: "USD" } }],
    })}</script>`;
    const node = extractJsonLdProduct(html);
    expect(node?.name).toBe("X");
    expect(parseProductFromHtml(html, "https://s.com").priceText).toBe("$5.9");
  });

  it("无 JSON-LD → OpenGraph 兜底（含相对图片转绝对）", () => {
    const html = `<head>
      <meta property="og:title" content="精华液 30ml">
      <meta property="og:description" content="紧致抗老">
      <meta property="og:image" content="/static/serum.jpg">
      <meta property="product:price:amount" content="129">
      <meta property="product:price:currency" content="USD">
    </head>`;
    const p = parseProductFromHtml(html, "https://brand.com/products/serum");
    expect(p.title).toBe("精华液 30ml");
    expect(p.description).toBe("紧致抗老");
    expect(p.priceText).toBe("$129");
    expect(p.images).toEqual(["https://brand.com/static/serum.jpg"]);
  });

  it("无 JSON-LD / 无 OG → <title> + meta description 兜底", () => {
    const html = `<head><title>神奇拖把 - 天猫</title><meta name="description" content="一拖即净"></head>`;
    const p = parseProductFromHtml(html, "https://x.tmall.com/item");
    expect(p.title).toBe("神奇拖把 - 天猫");
    expect(p.description).toBe("一拖即净");
    expect(p.images).toEqual([]);
  });

  it("图片去重（JSON-LD 与 og:image 同一张只留一份）", () => {
    const html = `
      <script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "A", image: "https://c.com/x.jpg" })}</script>
      <meta property="og:image" content="https://c.com/x.jpg">
      <meta name="twitter:image" content="https://c.com/y.jpg">`;
    const p = parseProductFromHtml(html, "https://c.com");
    expect(p.images).toEqual(["https://c.com/x.jpg", "https://c.com/y.jpg"]);
  });
});

// 解析 bug 群回归（audit 工作流实测复现）：撇号截断 / 二次解码 / 价格双符号·$0
describe("product-ingest 解析健壮性回归", () => {
  it("getMeta：双引号 content 内含单引号不被截断", () => {
    expect(getMeta(`<meta property="og:title" content="Tom's Coffee Mug">`, ["og:title"])).toBe("Tom's Coffee Mug");
  });
  it("getMeta：单引号 content 内含双引号不被截断", () => {
    expect(getMeta(`<meta name="twitter:title" content='Say "Hi" now'>`, ["twitter:title"])).toBe('Say "Hi" now');
  });
  it("getMeta：既有简单用例不回归", () => {
    expect(getMeta(`<meta property="og:title" content="Hi">`, ["og:title"])).toBe("Hi");
    expect(getMeta(`<meta content="Yo" name="twitter:title">`, ["twitter:title"])).toBe("Yo");
  });
  it("decodeEntities：不二次解码已转义实体（&amp;#39; 保留为 &#39;）", () => {
    expect(decodeEntities("Tom&amp;#39;s")).toBe("Tom&#39;s");
    expect(decodeEntities("5 &amp;lt; 10")).toBe("5 &lt; 10");
  });
  it("decodeEntities：既有混合用例不回归", () => {
    expect(decodeEntities("A &amp; B&#39;s  caf&#xe9;")).toBe("A & B's café");
  });
  it("价格：已自带符号不重复加（$19.99 不变 $$19.99）", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "X", offers: { price: "$19.99", priceCurrency: "USD" } })}</script>`;
    expect(parseProductFromHtml(html, "https://s.com").priceText).toBe("$19.99");
  });
  it("价格：0 / 负数视为无效（不产出 $0）", () => {
    const mk = (price: unknown) => `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "X", offers: { price, priceCurrency: "USD" } })}</script>`;
    expect(parseProductFromHtml(mk(0), "https://s.com").priceText).toBeUndefined();
    expect(parseProductFromHtml(mk("-5"), "https://s.com").priceText).toBeUndefined();
  });
  it("价格：纯数字正常加符号", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "X", offers: { price: 19.99, priceCurrency: "USD" } })}</script>`;
    expect(parseProductFromHtml(html, "https://s.com").priceText).toBe("$19.99");
  });
  it("解析：含撇号标题 + 自带符号价格端到端正确", () => {
    const html = `<head>
      <meta property="og:title" content="L'Oréal Men's Serum">
      <script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "", offers: { price: "$29.90", priceCurrency: "USD" } })}</script>
    </head>`;
    const p = parseProductFromHtml(html, "https://shop.com/p");
    expect(p.title).toBe("L'Oréal Men's Serum");
    expect(p.priceText).toBe("$29.90");
  });
});

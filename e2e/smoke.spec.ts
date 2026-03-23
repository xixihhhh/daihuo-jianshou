import { test, expect } from "@playwright/test";

test.describe("冒烟测试", () => {
  test("首页可以正常加载", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=带货剪手")).toBeVisible();
    await expect(page.locator("text=新建项目")).toBeVisible();
    await expect(page.locator("text=爆款复刻")).toBeVisible();
  });

  test("商品库页面可以加载", async ({ page }) => {
    await page.goto("/products");
    await expect(page.locator("text=商品库")).toBeVisible();
  });

  test("新建项目流程可以到达表单", async ({ page }) => {
    await page.goto("/project/new");
    await expect(page.locator("text=商品图片")).toBeVisible();
    await expect(page.locator("text=商品名称")).toBeVisible();
    await expect(page.locator("text=视频模式")).toBeVisible();
  });

  test("设置页可以切换 Tab", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=AI 平台")).toBeVisible();
    await page.click("text=出镜人物");
    await expect(page.locator("text=添加出镜人物")).toBeVisible();
    await page.click("text=品牌设置");
    await expect(page.locator("text=店铺名称")).toBeVisible();
  });

  test("批量出片页面可以加载", async ({ page }) => {
    await page.goto("/batch");
    await expect(page.locator("text=批量出片")).toBeVisible();
  });
});

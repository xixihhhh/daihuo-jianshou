import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // schema 文件路径
  schema: "./src/lib/db/schema.ts",
  // 迁移文件输出目录
  out: "./drizzle",
  // 使用 SQLite 方言
  dialect: "sqlite",
  // 数据库连接配置
  dbCredentials: {
    url: "./data/sqlite.db",
  },
});

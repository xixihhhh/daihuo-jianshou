import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

// 数据库文件路径，放在项目根目录的 data 目录下
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "sqlite.db");

// 确保 data 目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 创建 better-sqlite3 连接实例
const sqlite = new Database(DB_PATH);

// 开启 WAL 模式，提升并发读写性能
sqlite.pragma("journal_mode = WAL");
// 开启外键约束
sqlite.pragma("foreign_keys = ON");

// 创建 drizzle ORM 实例，绑定 schema 以支持关系查询
export const db = drizzle(sqlite, { schema });

// 兼容函数式调用
export function getDb() {
  return db;
}

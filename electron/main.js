// Electron 主进程：把 Next standalone 当本地 HTTP 服务拉起，再用窗口加载它
// 关键点（均来自打包研究的实测结论）：
//  - 数据写到 app.getPath('userData')/data（可写），通过 APP_DATA_DIR 注入给 server（standalone 的 cwd 只读）
//  - ffmpeg/ffprobe 用随包二进制，注入 FFMPEG_PATH/FFPROBE_PATH（用户机无需装 ffmpeg）
//  - 取空闲端口（不写死 3000）、HTTP 轮询 ready 再 loadURL、退出时 kill 子进程
const { app, BrowserWindow } = require("electron");
const { fork } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");
const fs = require("fs");

let serverChild = null;
let mainWindow = null;

/** 取一个本地空闲端口 */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** 解析随包二进制绝对路径，修正 asar → asar.unpacked */
function resolveBinary(getter) {
  try {
    let p = getter();
    if (p && p.includes("app.asar" + path.sep)) {
      p = p.replace("app.asar" + path.sep, "app.asar.unpacked" + path.sep);
    }
    return p || "";
  } catch {
    return "";
  }
}

/** standalone server.js 入口：打包后在 resources/standalone，开发态在 .next/standalone */
function serverEntry() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "standalone", "server.js")
    : path.join(__dirname, "..", ".next", "standalone", "server.js");
}

/** 迁移 SQL 目录（只读资源）：打包后随 standalone，开发态用项目根 drizzle */
function migrationsDir(serverDir) {
  return app.isPackaged ? path.join(serverDir, "drizzle") : path.join(__dirname, "..", "drizzle");
}

/** HTTP 轮询直到服务可用（实测 ~0.5s ready，最多约 15s 兜底） */
function waitReady(port, tries = 60) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = http.get({ host: "127.0.0.1", port, path: "/" }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry(n);
      });
      req.on("error", () => retry(n));
    };
    const retry = (n) => (n <= 0 ? reject(new Error("本地服务未就绪")) : setTimeout(() => attempt(n - 1), 250));
    attempt(tries);
  });
}

/** 启动 standalone server 子进程并等待就绪，返回访问 URL */
async function startServer() {
  const entry = serverEntry();
  const serverDir = path.dirname(entry);
  const dataDir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const port = await getFreePort();

  const ffmpegPath = resolveBinary(() => require("ffmpeg-static"));
  const ffprobePath = resolveBinary(() => require("@ffprobe-installer/ffprobe").path);

  serverChild = fork(entry, [], {
    cwd: serverDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      APP_DATA_DIR: dataDir,
      APP_MIGRATIONS_DIR: migrationsDir(serverDir),
      ...(ffmpegPath ? { FFMPEG_PATH: ffmpegPath } : {}),
      ...(ffprobePath ? { FFPROBE_PATH: ffprobePath } : {}),
    },
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });

  await waitReady(port);
  return `http://127.0.0.1:${port}`;
}

function killServer() {
  if (serverChild) {
    try {
      serverChild.kill();
    } catch {
      /* ignore */
    }
    serverChild = null;
  }
}

app.whenReady().then(async () => {
  let url;
  try {
    url = await startServer();
  } catch (e) {
    console.error("启动本地服务失败:", e);
    app.quit();
    return;
  }

  // headless 冒烟模式：验证 server 能在 Electron 运行时下起来，并打一个 DB 路由
  // （触发 better-sqlite3 在 Electron Node ABI 下加载 + migrate），不开窗，立即退出
  if (process.env.HEADLESS_SMOKE) {
    const dbProbe = await new Promise((resolve) => {
      const req = http.get(url + "/api/project", (r) => {
        let d = "";
        r.on("data", (c) => (d += c));
        r.on("end", () => resolve(`status=${r.statusCode} body=${d.slice(0, 60)}`));
      });
      req.on("error", (e) => resolve("err=" + e.message));
    });
    console.log("DB_ROUTE", dbProbe);
    console.log("SMOKE_OK", url, "DATA_DIR=" + path.join(app.getPath("userData"), "data"));
    killServer();
    app.exit(0);
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: "ClipForge",
    backgroundColor: "#0a0a0a",
    webPreferences: { contextIsolation: true },
  });
  mainWindow.loadURL(url);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

app.on("window-all-closed", () => {
  killServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", killServer);

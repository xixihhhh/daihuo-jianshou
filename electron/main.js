// Electron main process: start Next standalone as a local HTTP server, then load it in a window.
// Key points (all validated through real packaging tests):
//  - Data is written to app.getPath('userData')/data (writable), injected into the server via APP_DATA_DIR (standalone cwd is read-only)
//  - ffmpeg/ffprobe use bundled binaries, injected via FFMPEG_PATH/FFPROBE_PATH (no ffmpeg install required on the user's machine)
//  - Acquire a free port (not hardcoded to 3000), poll HTTP until ready before loadURL, kill child process on exit
const { app, BrowserWindow } = require("electron");
const { fork } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");
const fs = require("fs");

let serverChild = null;
let mainWindow = null;

/** Find a free local port */
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

/** Resolve the absolute path of a bundled binary, correcting asar → asar.unpacked */
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

/** Path to standalone server.js entry: resources/standalone when packaged, .next/standalone in dev */
function serverEntry() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "standalone", "server.js")
    : path.join(__dirname, "..", ".next", "standalone", "server.js");
}

/** SQL migrations directory (read-only resource): bundled alongside standalone when packaged, or project root drizzle in dev */
function migrationsDir(serverDir) {
  return app.isPackaged ? path.join(serverDir, "drizzle") : path.join(__dirname, "..", "drizzle");
}

/** Poll via HTTP until the server is available (typically ready in ~0.5s, up to ~15s timeout) */
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

/** Start the standalone server child process, wait until ready, and return the access URL */
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

  // Headless smoke mode: verify the server can start under the Electron runtime and hit a DB route
  // (triggers better-sqlite3 load + migrate under the Electron Node ABI); no window is opened, exits immediately
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

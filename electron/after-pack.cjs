// electron-builder afterPack hook: copies the entire Next standalone output (including a full node_modules) into the app resources directory.
// Reason: electron-builder's extraResources file collector actively drops node_modules directories,
// leaving standalone/node_modules empty after packaging (next / better-sqlite3 native modules not found → crash on startup).
// The standalone has already been dereferenced into real files without symlinks by bundle-standalone.mjs, so a plain directory copy bypasses this filter.
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

exports.default = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  const productName = packager.appInfo.productFilename;

  const resourcesDir =
    electronPlatformName === "darwin"
      ? path.join(appOutDir, `${productName}.app`, "Contents", "Resources")
      : path.join(appOutDir, "resources");

  const src = path.join(process.cwd(), ".next", "standalone");
  const dest = path.join(resourcesDir, "standalone");

  if (!fs.existsSync(src)) {
    throw new Error(`[afterPack] 未找到 ${src}，请确认已 next build + bundle:standalone`);
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  // Use cp -R to preserve the full pnpm relative symlink structure, avoiding dereferencing that would lose @swc/helpers and other peer deps.
  // mac/linux: cp -R; Windows packaging (CI matrix) uses robocopy /e (preserves junctions).
  if (process.platform === "win32") {
    execSync(`robocopy "${src}" "${dest}" /e /nfl /ndl /njh /njs >NUL || ver>NUL`, { shell: "cmd.exe" });
  } else {
    execSync(`cp -R "${src}/." "${dest}/"`);
  }

  const ok = fs.existsSync(path.join(dest, "node_modules", "next", "package.json"));
  console.log(`[afterPack] standalone 已拷入 ${dest}（next 模块就位:${ok}）`);
  if (!ok) throw new Error("[afterPack] 拷贝后未见 node_modules/next，打包中止");
};

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output: next build additionally emits .next/standalone (minimal server.js + nft-traced dependency subset),
  // used by the Electron main process to fork-start the server without requiring npm install on the user's machine. Does not affect next dev.
  output: "standalone",
  // better-sqlite3 is a native module; mark it external (loaded via require, so the bundler won't try to bundle its .node file)
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;

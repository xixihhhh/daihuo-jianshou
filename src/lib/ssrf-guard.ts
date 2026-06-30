/**
 * SSRF protection — user-controlled URLs (product link ingestion, og:image scraping) must pass through
 * here before being fetched server-side; otherwise an attacker could craft requests to
 * http://169.254.169.254/ (cloud metadata) or http://127.0.0.1:6379/ (internal services), etc.
 * Strategy: validate the scheme + ensure every IP resolved for the host is outside private/loopback/
 * link-local/reserved ranges; manually follow redirects and re-validate each hop.
 */
import { lookup } from "dns/promises";
import net from "net";

/** Returns true if an IP falls within a blocked private/loopback/link-local/reserved range (IPv4 + IPv6). Pure function, unit-testable. */
export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    if (p[0] === 0) return true; // 0.0.0.0/8 — current network
    if (p[0] === 10) return true; // 10/8 — private network
    if (p[0] === 127) return true; // 127/8 — loopback
    if (p[0] === 169 && p[1] === 254) return true; // 169.254/16 — link-local + cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16/12 — private network
    if (p[0] === 192 && p[1] === 168) return true; // 192.168/16 — private network
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // 100.64/10 — CGNAT
    // Note: 198.18/15 (RFC 2544 benchmarking range) is NOT blocked — Cloudflare WARP and similar services
    // use it as a transparent proxy address for forwarding public traffic; blocking it would break legitimate users.
    if (p[0] >= 224) return true; // 224+ — multicast/reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === "::1" || low === "::") return true; // loopback / unspecified
    if (low.startsWith("fe80")) return true; // link-local
    if (low.startsWith("fc") || low.startsWith("fd")) return true; // fc00::/7 ULA
    const mapped = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }
  return true; // invalid IP — block unconditionally
}

/** Validates a URL: must use http/https and all IPs resolved for the host must be public; throws otherwise. */
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("非法 URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("仅支持 http/https");
  // Strip brackets from IPv6 literals (URL.hostname keeps brackets for [::1], which causes net.isIP to fail and fall through to DNS)
  const host = u.hostname.replace(/^\[/, "").replace(/\]$/, "");
  let ips: string[];
  if (net.isIP(host)) {
    ips = [host];
  } else {
    const records = await lookup(host, { all: true });
    ips = records.map((r) => r.address);
  }
  if (ips.length === 0) throw new Error("无法解析主机");
  for (const ip of ips) {
    if (isBlockedIp(ip)) throw new Error(`目标地址被拒绝（内网/保留地址 ${ip}）`);
  }
}

/** SSRF-safe fetch: disables automatic redirect following; manually follows each hop and re-validates that every target is a public address. */
export async function safeFetch(url: string, init: RequestInit = {}, maxRedirects = 4): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current);
    // Apply a 15 s timeout per hop (unless the caller already provides a signal) to prevent slow or malicious servers from stalling the request indefinitely
    const res = await fetch(current, { ...init, redirect: "manual", signal: init.signal ?? AbortSignal.timeout(15000) });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current).href; // resolve potentially relative redirect locations
      continue;
    }
    return res;
  }
  throw new Error("重定向次数过多");
}

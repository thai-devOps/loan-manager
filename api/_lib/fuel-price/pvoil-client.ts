import https from "node:https";
import { FuelPriceError } from "./errors.js";
import { parsePvoilAvailableDates } from "./parser.js";
import type { PvoilAvailableDate } from "./types.js";

export const PVOIL_HOST = "www.pvoil.com.vn";
export const PVOIL_PAGE_URL = `https://${PVOIL_HOST}/tin-gia-xang-dau`;
export const PVOIL_LOAD_VIEW_URL = `https://${PVOIL_HOST}/api/oilprice/load-view`;

/** Cloudflare sits in front of DNS — hit origin IP with Host/SNI instead. */
const DEFAULT_ORIGIN_IPS = ["103.21.120.100"];

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const MAX_BODY_BYTES = 2_000_000;

function userAgent(): string {
  return (
    (process.env.PVOIL_USER_AGENT ?? "").trim() ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
}

function originIps(): string[] {
  const raw = (process.env.PVOIL_ORIGIN_IP ?? "").trim();
  if (/^(0|off|false|no)$/i.test(raw)) return [];
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return DEFAULT_ORIGIN_IPS;
}

function browserHeaders(includeHost: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "User-Agent": userAgent(),
    Referer: PVOIL_PAGE_URL,
  };
  if (includeHost) headers.Host = PVOIL_HOST;
  return headers;
}

function looksLikeCloudflareChallenge(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("__cf_chl") ||
    lower.includes("just a moment") ||
    lower.includes("cf-mitigated") ||
    (lower.includes("cloudflare") && lower.includes("challenge"))
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

function fetchViaOriginIp(pathWithQuery: string, ip: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: ip,
        port: 443,
        path: pathWithQuery,
        method: "GET",
        headers: browserHeaders(true),
        servername: PVOIL_HOST,
        timeout: DEFAULT_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_BODY_BYTES) {
            req.destroy();
            reject(
              new FuelPriceError("PVOIL_INVALID_RESPONSE", "Body quá lớn"),
            );
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          const text = Buffer.concat(chunks).toString("utf8");
          if (status < 200 || status >= 300) {
            reject(
              new FuelPriceError("PVOIL_FETCH_FAILED", `HTTP ${status}`),
            );
            return;
          }
          if (!text) {
            reject(new FuelPriceError("PVOIL_INVALID_RESPONSE", "Body trống"));
            return;
          }
          if (looksLikeCloudflareChallenge(text)) {
            reject(
              new FuelPriceError(
                "PVOIL_FETCH_FAILED",
                "Cloudflare challenge (origin IP)",
              ),
            );
            return;
          }
          resolve(text);
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new FuelPriceError("PVOIL_TIMEOUT"));
    });
    req.on("error", (e) => {
      if (e instanceof FuelPriceError) {
        reject(e);
        return;
      }
      reject(
        new FuelPriceError(
          "PVOIL_FETCH_FAILED",
          e instanceof Error ? e.message : String(e),
        ),
      );
    });
    req.end();
  });
}

async function fetchViaDns(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: browserHeaders(false),
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      throw new FuelPriceError("PVOIL_FETCH_FAILED", `HTTP ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) {
      throw new FuelPriceError("PVOIL_INVALID_RESPONSE", "Body trống");
    }
    if (buf.byteLength > MAX_BODY_BYTES) {
      throw new FuelPriceError("PVOIL_INVALID_RESPONSE", "Body quá lớn");
    }
    const text = new TextDecoder("utf-8").decode(buf);
    if (looksLikeCloudflareChallenge(text)) {
      throw new FuelPriceError(
        "PVOIL_FETCH_FAILED",
        "Cloudflare challenge (DNS)",
      );
    }
    return text;
  } catch (e) {
    if (e instanceof FuelPriceError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new FuelPriceError("PVOIL_TIMEOUT");
    }
    throw new FuelPriceError(
      "PVOIL_FETCH_FAILED",
      e instanceof Error ? e.message : String(e),
    );
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextOnce(url: string): Promise<string> {
  const parsed = new URL(url);
  const pathWithQuery = `${parsed.pathname}${parsed.search}`;
  const ips = originIps();
  let lastError: unknown;

  for (const ip of ips) {
    try {
      return await fetchViaOriginIp(pathWithQuery, ip);
    } catch (e) {
      lastError = e;
      console.warn("[fuel-price] origin_ip_fetch_failed", {
        ip,
        path: pathWithQuery,
        code: e instanceof FuelPriceError ? e.code : "UNKNOWN",
        error: e instanceof Error ? e.message : String(e),
        at: new Date().toISOString(),
      });
    }
  }

  try {
    return await fetchViaDns(url);
  } catch (e) {
    if (lastError instanceof FuelPriceError) throw lastError;
    throw e;
  }
}

async function fetchText(url: string, attempt = 0): Promise<string> {
  try {
    return await fetchTextOnce(url);
  } catch (e) {
    const retryable =
      e instanceof FuelPriceError &&
      (e.code === "PVOIL_FETCH_FAILED" || e.code === "PVOIL_TIMEOUT");
    if (retryable && attempt < MAX_RETRIES) {
      await sleep(300 * 2 ** attempt);
      return fetchText(url, attempt + 1);
    }
    throw e;
  }
}

export async function discoverAvailableDates(): Promise<PvoilAvailableDate[]> {
  console.info("[fuel-price] pvoil_sync_started", {
    event: "pvoil_sync_started",
    at: new Date().toISOString(),
  });
  const html = await fetchText(PVOIL_PAGE_URL);
  const dates = parsePvoilAvailableDates(html);
  console.info("[fuel-price] pvoil_latest_date_discovered", {
    event: "pvoil_latest_date_discovered",
    rawDate: dates[0]?.rawDate,
    effectiveAt: dates[0]?.effectiveAt,
    count: dates.length,
    at: new Date().toISOString(),
  });
  return dates;
}

export function buildPriceViewUrl(rawDate: string): string {
  const url = new URL(PVOIL_LOAD_VIEW_URL);
  url.searchParams.set("date", rawDate);
  return url.toString();
}

export async function fetchPriceView(rawDate: string): Promise<{
  html: string;
  sourceUrl: string;
}> {
  const sourceUrl = buildPriceViewUrl(rawDate);
  const html = await fetchText(sourceUrl);
  if (!/<table[\s>]/i.test(html)) {
    throw new FuelPriceError(
      "PVOIL_INVALID_RESPONSE",
      "Thiếu bảng HTML",
    );
  }
  console.info("[fuel-price] pvoil_price_fetched", {
    event: "pvoil_price_fetched",
    rawDate,
    bytes: html.length,
    at: new Date().toISOString(),
  });
  return { html, sourceUrl };
}

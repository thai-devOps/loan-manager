import {
  getFuelPriceRegion,
  getFuelSourceTimeoutMs,
  getPetrolimexFuelPriceUrl,
} from "../../config.js";
import { parsePetrolimexFuelPriceHtml } from "./petrolimex.parser.js";
import { mapPetrolimexProductName } from "./petrolimex.map.js";
import {
  FuelSourceError,
  type PetrolimexParseResult,
} from "./petrolimex.types.js";
import type { FuelPriceProduct } from "../../types.js";

const DEFAULT_UA =
  "Mozilla/5.0 (compatible; SiThaTripFuelPriceBot/1.0; +https://www.chauthai.id.vn/)";

/** Petrolimex CMS IDs used by homepage `__vieapps.prices.fetch`. */
const PETROLIMEX_SYSTEM_ID = "6783dc1271ff449e95b74a9520964169";
const PETROLIMEX_REPOSITORY_ID = "a95451e23b474fe5886bfb7cf843f53c";
const PETROLIMEX_ENTITY_ID = "3801378fe1e045b1afa10de7c5776124";

const DEFAULT_CMS_API_BASE = "https://portals.petrolimex.com.vn/~apis";

type CmsPriceItem = {
  Title?: string;
  Zone1Price?: number | string;
  Zone2Price?: number | string;
  LastModified?: string;
  OrderIndex?: number | string;
  DIsplayOrder?: number | string;
};

function getCmsApiBase(): string {
  const raw = (process.env.PETROLIMEX_CMS_API_URL ?? "").trim();
  return raw || DEFAULT_CMS_API_BASE;
}

/** base64url(JSON) — same as `__vieapps.crypto.jsonEncode`. */
function jsonEncodeRequest(payload: unknown): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function fetchText(
  url: string,
  timeoutMs: number,
): Promise<{ body: string; finalUrl: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "application/json,text/html,application/xhtml+xml",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
      },
    });
    if (res.status === 403 || res.status === 429) {
      throw new FuelSourceError(
        "FUEL_SOURCE_BLOCKED",
        `Petrolimex chặn truy cập (HTTP ${res.status})`,
        res.status,
      );
    }
    if (!res.ok) {
      throw new FuelSourceError(
        "FUEL_SOURCE_HTTP_ERROR",
        `HTTP ${res.status} từ Petrolimex`,
        res.status,
      );
    }
    const body = await res.text();
    return { body, finalUrl: res.url || url, status: res.status };
  } catch (e) {
    if (e instanceof FuelSourceError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new FuelSourceError(
        "FUEL_SOURCE_TIMEOUT",
        `Hết thời gian chờ Petrolimex sau ${timeoutMs}ms`,
      );
    }
    throw new FuelSourceError(
      "FUEL_SOURCE_HTTP_ERROR",
      e instanceof Error ? e.message : String(e),
    );
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
): Promise<{ body: string; finalUrl: string; status: number }> {
  const timeoutMs = getFuelSourceTimeoutMs();
  const maxAttempts = 3;
  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchText(url, timeoutMs);
    } catch (e) {
      last = e;
      if (e instanceof FuelSourceError && e.code === "FUEL_SOURCE_BLOCKED") {
        throw e;
      }
      const retryable =
        e instanceof FuelSourceError &&
        (e.code === "FUEL_SOURCE_TIMEOUT" ||
          e.code === "FUEL_SOURCE_HTTP_ERROR") &&
        (e.httpStatus == null || e.httpStatus >= 500);
      if (!retryable || attempt === maxAttempts) throw e;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  throw last;
}

function toPositiveInt(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^\d]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * Mirror Petrolimex UI rounding of LastModified → display "15:00 - 1/10/2026" (+07).
 */
export function petrolimexEffectiveFromLastModified(
  lastModifiedIso: string,
): { effectiveAt: string; effectiveDateRaw: string } | null {
  const d = new Date(lastModifiedIso);
  if (Number.isNaN(d.getTime())) return null;

  // Work in Asia/Ho_Chi_Minh (+07)
  const vnMs = d.getTime() + 7 * 60 * 60 * 1000;
  const vn = new Date(vnMs);
  let hour = vn.getUTCHours();
  let minute = vn.getUTCMinutes();
  const day = vn.getUTCDate();
  const month = vn.getUTCMonth() + 1;
  const year = vn.getUTCFullYear();

  if (minute > 50) {
    hour += 1;
    minute = 0;
    if (hour >= 24) hour = 0;
  } else if (minute >= 45) minute = 45;
  else if (minute >= 30) minute = 30;
  else if (minute >= 15) minute = 15;
  else minute = 0;

  const raw = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`;
  const out = new Date(iso);
  if (Number.isNaN(out.getTime())) return null;
  return { effectiveAt: out.toISOString(), effectiveDateRaw: raw };
}

function mapCmsObjects(
  objects: CmsPriceItem[],
  region: ReturnType<typeof getFuelPriceRegion>,
  sourceUrl: string,
  crawlStartedAt: string,
): PetrolimexParseResult {
  const warnings: string[] = [];
  const products: FuelPriceProduct[] = [];
  const seen = new Set<string>();
  let maxLastModified: string | null = null;

  const sorted = [...objects].sort((a, b) => {
    const ao = Number(a.DIsplayOrder ?? a.OrderIndex ?? 0);
    const bo = Number(b.DIsplayOrder ?? b.OrderIndex ?? 0);
    return ao - bo;
  });

  for (const item of sorted) {
    const name = String(item.Title ?? "").replace(/\s+/g, " ").trim();
    if (!name) continue;
    const mapped = mapPetrolimexProductName(name);
    if (mapped.unknown) {
      warnings.push(`Sản phẩm không nhận diện: ${name}`);
      continue;
    }
    if (seen.has(String(mapped.code))) continue;

    const region1 = toPositiveInt(item.Zone1Price);
    const region2 = toPositiveInt(item.Zone2Price);
    if (region1 == null || region2 == null) {
      warnings.push(`Giá không hợp lệ: ${name}`);
      continue;
    }
    const price = region === "REGION_2" ? region2 : region1;
    seen.add(String(mapped.code));
    products.push({
      code: mapped.code,
      name: mapped.name,
      price,
      change: null,
      unit: "VND/L",
      grade: mapped.grade,
      region1Price: region1,
      region2Price: region2,
      unknown: false,
    });

    if (item.LastModified) {
      const t = new Date(item.LastModified).getTime();
      if (
        !Number.isNaN(t) &&
        (!maxLastModified ||
          t > new Date(maxLastModified).getTime())
      ) {
        maxLastModified = item.LastModified;
      }
    }
  }

  if (products.length < 3) {
    throw new FuelSourceError(
      "FUEL_SOURCE_INVALID_DATA",
      `CMS chỉ trả ${products.length} sản phẩm hợp lệ`,
    );
  }

  let effectiveAt = crawlStartedAt;
  let effectiveDateRaw = crawlStartedAt;
  let effectiveTimeSource: PetrolimexParseResult["effectiveTimeSource"] =
    "CRAWL_TIME";
  if (maxLastModified) {
    const parsed = petrolimexEffectiveFromLastModified(maxLastModified);
    if (parsed) {
      effectiveAt = parsed.effectiveAt;
      effectiveDateRaw = parsed.effectiveDateRaw;
      effectiveTimeSource = "SOURCE";
    } else {
      warnings.push("Không làm tròn được LastModified — dùng crawl time");
    }
  } else {
    warnings.push("CMS thiếu LastModified — dùng crawl time");
  }

  return {
    products,
    effectiveAt,
    effectiveDateRaw,
    effectiveTimeSource,
    sourceUrl,
    warnings,
  };
}

async function fetchFromCmsApi(
  crawlStartedAt: string,
): Promise<PetrolimexParseResult> {
  const region = getFuelPriceRegion();
  const sourceUrl = getPetrolimexFuelPriceUrl();
  const xRequest = jsonEncodeRequest({
    FilterBy: {
      And: [
        { SystemID: { Equals: PETROLIMEX_SYSTEM_ID } },
        { RepositoryID: { Equals: PETROLIMEX_REPOSITORY_ID } },
        { RepositoryEntityID: { Equals: PETROLIMEX_ENTITY_ID } },
        { Status: { Equals: "Published" } },
      ],
    },
    SortBy: { LastModified: "Descending" },
    Pagination: {
      TotalRecords: -1,
      TotalPages: 0,
      PageSize: 0,
      PageNumber: 0,
    },
  });

  const url = `${getCmsApiBase()}/portals/cms.item/search?x-request=${encodeURIComponent(xRequest)}`;
  console.info("[FUEL_PRICE] cms_fetch", { url: url.split("?")[0] });

  const res = await fetchWithRetry(url);
  let data: { Objects?: CmsPriceItem[] };
  try {
    data = JSON.parse(res.body) as { Objects?: CmsPriceItem[] };
  } catch {
    throw new FuelSourceError(
      "FUEL_SOURCE_PARSE_ERROR",
      "CMS API trả JSON không hợp lệ",
    );
  }
  const objects = Array.isArray(data.Objects) ? data.Objects : [];
  if (objects.length < 3) {
    throw new FuelSourceError(
      "FUEL_SOURCE_INVALID_DATA",
      `CMS API trả ${objects.length} object`,
    );
  }
  return mapCmsObjects(objects, region, sourceUrl, crawlStartedAt);
}

async function fetchFromHomepageHtml(
  crawlStartedAt: string,
): Promise<PetrolimexParseResult> {
  const sourceUrl = getPetrolimexFuelPriceUrl();
  const region = getFuelPriceRegion();
  const page = await fetchWithRetry(sourceUrl);
  return parsePetrolimexFuelPriceHtml(page.body, page.finalUrl, {
    region,
    crawlStartedAt,
  });
}

/**
 * Homepage table is JS-rendered — primary path is Petrolimex CMS API
 * (same endpoint the site uses). HTML parse remains a fallback.
 */
export async function fetchPetrolimexFuelPrices(): Promise<PetrolimexParseResult> {
  const sourceUrl = getPetrolimexFuelPriceUrl();
  const region = getFuelPriceRegion();
  const crawlStartedAt = new Date().toISOString();
  console.info("[FUEL_PRICE] start", {
    provider: "PETROLIMEX",
    sourceUrl,
    region,
  });

  try {
    const parsed = await fetchFromCmsApi(crawlStartedAt);
    console.info("[FUEL_PRICE] parsed", {
      provider: "PETROLIMEX",
      via: "cms_api",
      products: parsed.products.length,
      effectiveAt: parsed.effectiveAt,
      effectiveTimeSource: parsed.effectiveTimeSource,
      warnings: parsed.warnings,
    });
    return parsed;
  } catch (cmsErr) {
    console.warn("[FUEL_PRICE] cms_api_failed_try_html", {
      error: cmsErr instanceof Error ? cmsErr.message : String(cmsErr),
    });
    try {
      const parsed = await fetchFromHomepageHtml(crawlStartedAt);
      console.info("[FUEL_PRICE] parsed", {
        provider: "PETROLIMEX",
        via: "html",
        products: parsed.products.length,
        effectiveAt: parsed.effectiveAt,
      });
      return parsed;
    } catch {
      if (cmsErr instanceof FuelSourceError) throw cmsErr;
      throw new FuelSourceError(
        "FUEL_SOURCE_UNKNOWN_ERROR",
        cmsErr instanceof Error ? cmsErr.message : String(cmsErr),
      );
    }
  }
}

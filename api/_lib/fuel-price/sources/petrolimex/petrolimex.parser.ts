import * as cheerio from "cheerio";
import { parseVndPrice } from "../../normalize.js";
import type { FuelPriceProduct, FuelPriceRegion } from "../../types.js";
import { mapPetrolimexProductName } from "./petrolimex.map.js";
import {
  FuelSourceError,
  type EffectiveTimeSource,
  type PetrolimexParseResult,
} from "./petrolimex.types.js";

/**
 * Parse "Giá của Petrolimex cập nhật lúc 15:00 - 1/10/2026" → ISO (+07:00).
 */
export function parsePetrolimexEffectiveAt(text: string): {
  effectiveAt: string | null;
  effectiveDateRaw: string;
} {
  const normalized = text.replace(/\s+/g, " ").trim();
  const m = normalized.match(
    /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  );
  if (!m) {
    return { effectiveAt: null, effectiveDateRaw: normalized };
  }
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const day = Number(m[3]);
  const month = Number(m[4]);
  const year = Number(m[5]);
  const raw = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { effectiveAt: null, effectiveDateRaw: raw };
  }
  return { effectiveAt: d.toISOString(), effectiveDateRaw: raw };
}

export function parsePetrolimexFuelPriceHtml(
  html: string,
  sourceUrl: string,
  opts: {
    region: FuelPriceRegion;
    crawlStartedAt: string;
  },
): PetrolimexParseResult {
  if (!html?.trim()) {
    throw new FuelSourceError(
      "FUEL_SOURCE_PARSE_ERROR",
      "HTML Petrolimex trống",
    );
  }

  const $ = cheerio.load(html);
  const root = $(".header__pricePetrol").first();
  if (!root.length) {
    throw new FuelSourceError(
      "FUEL_SOURCE_PARSE_ERROR",
      "Không tìm thấy .header__pricePetrol",
    );
  }

  const rows = root.find("table tbody tr");
  if (rows.length < 3) {
    throw new FuelSourceError(
      "FUEL_SOURCE_PARSE_ERROR",
      `Bảng giá có ít hơn 3 dòng (${rows.length})`,
    );
  }

  const warnings: string[] = [];
  const products: FuelPriceProduct[] = [];
  const seen = new Set<string>();

  rows.each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
      .get();
    if (cells.length < 3) return;
    const name = cells[0] ?? "";
    if (!name || /sản phẩm/i.test(name)) return;

    const mapped = mapPetrolimexProductName(name);
    if (mapped.unknown) {
      warnings.push(`Sản phẩm không nhận diện: ${name}`);
      console.warn("[FUEL_PRICE] unknown_product", { name, sourceUrl });
      return;
    }
    if (seen.has(String(mapped.code))) return;

    const region1 = parseVndPrice(cells[1] ?? "");
    const region2 = parseVndPrice(cells[2] ?? "");
    if (region1 == null || region1 <= 0 || region2 == null || region2 <= 0) {
      warnings.push(`Giá không hợp lệ: ${name}`);
      return;
    }

    const price = opts.region === "REGION_2" ? region2 : region1;
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
  });

  if (products.length < 3) {
    throw new FuelSourceError(
      "FUEL_SOURCE_INVALID_DATA",
      `Chỉ parse được ${products.length} sản phẩm hợp lệ`,
    );
  }

  const infoText = root.find(".f-info").text() || root.text();
  const parsedTime = parsePetrolimexEffectiveAt(infoText);
  let effectiveAt = parsedTime.effectiveAt;
  let effectiveDateRaw = parsedTime.effectiveDateRaw;
  let effectiveTimeSource: EffectiveTimeSource = "SOURCE";
  if (!effectiveAt) {
    effectiveAt = opts.crawlStartedAt;
    effectiveDateRaw = opts.crawlStartedAt;
    effectiveTimeSource = "CRAWL_TIME";
    warnings.push("Không đọc được thời gian cập nhật Petrolimex — dùng crawl time");
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

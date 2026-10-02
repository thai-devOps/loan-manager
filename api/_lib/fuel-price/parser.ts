import * as cheerio from "cheerio";
import { FuelPriceError } from "./errors.js";
import {
  formatPvoilDisplayDate,
  normalizeFuelProductName,
  parsePriceChange,
  parsePvoilEffectiveDate,
  parseVndPrice,
} from "./normalize.js";
import type {
  FuelPriceProduct,
  PvoilAvailableDate,
} from "./types.js";

export function parsePvoilAvailableDates(html: string): PvoilAvailableDate[] {
  if (!html || !html.trim()) {
    throw new FuelPriceError("PVOIL_NO_AVAILABLE_DATES", "HTML trống");
  }
  const $ = cheerio.load(html);
  const options = $("#ddlpricedate option");
  if (options.length === 0) {
    throw new FuelPriceError(
      "PVOIL_NO_AVAILABLE_DATES",
      "Không tìm thấy #ddlpricedate",
    );
  }

  const dates: PvoilAvailableDate[] = [];
  options.each((_, el) => {
    const rawDate = ($(el).attr("value") ?? "").trim();
    if (!rawDate) return;
    const effectiveAt = parsePvoilEffectiveDate(rawDate);
    if (!effectiveAt) return;
    dates.push({
      rawDate,
      effectiveAt,
      displayDate: formatPvoilDisplayDate(rawDate),
    });
  });

  if (dates.length === 0) {
    throw new FuelPriceError(
      "PVOIL_NO_AVAILABLE_DATES",
      "Không có ngày hợp lệ",
    );
  }

  dates.sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt));
  return dates;
}

export function parsePvoilFuelPriceHtml(
  html: string,
  effectiveAt: string,
): FuelPriceProduct[] {
  if (!html || !html.trim()) {
    throw new FuelPriceError("PVOIL_PARSE_FAILED", "HTML trống");
  }
  const $ = cheerio.load(html);
  const table = $("table").first();
  if (table.length === 0) {
    throw new FuelPriceError("PVOIL_PARSE_FAILED", "Thiếu bảng giá");
  }

  const products: FuelPriceProduct[] = [];
  table.find("tbody tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .toArray()
      .map((td) =>
        $(td)
          .text()
          .replace(/\u00a0/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      );
    if (cells.length < 3) return;
    const nameRaw = cells[1] ?? "";
    const priceRaw = cells[2] ?? "";
    const changeRaw = cells[3] ?? "";
    if (!nameRaw || !priceRaw) return;

    const price = parseVndPrice(priceRaw);
    if (price == null) return;

    const { code, name, unknown } = normalizeFuelProductName(nameRaw);
    if (unknown) {
      console.warn("[fuel-price] unknown PVOIL product", {
        name,
        at: new Date().toISOString(),
      });
    }

    products.push({
      code,
      name,
      price,
      change: parsePriceChange(changeRaw),
      unit: "VND/L",
      unknown: unknown || undefined,
    });
  });

  if (products.length === 0) {
    throw new FuelPriceError(
      "PVOIL_PARSE_FAILED",
      "Không có dòng sản phẩm hợp lệ",
    );
  }

  void effectiveAt;
  return products;
}

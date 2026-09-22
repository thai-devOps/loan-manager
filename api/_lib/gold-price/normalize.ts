import type {
  GoldPrice,
  GoldPriceResult,
  GoldPriceSnapshotPrice,
  GoldPriceSource,
  PnjGoldPriceItem,
  PnjGoldPriceResponse,
} from "./types.js";

/** PNJ API quotes are in nghìn đồng / chỉ → multiply by 1000 for VND/chỉ. */
export const PNJ_PRICE_SCALE = 1000;

/**
 * Parse PNJ raw price field.
 * "" / whitespace / null / undefined → null (never coerce to 0 via Number("")).
 */
export function parsePnjRawPrice(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * PNJ_PRICE_SCALE);
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return null;
    return Math.round(raw * PNJ_PRICE_SCALE);
  }
  return null;
}

/** Parse PNJ updateDate like "22/09/2026 13:17:45" → ISO string (VN +07). */
export function parsePnjUpdateDate(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const m = raw
    .trim()
    .match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    );
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = Number(m[4] ?? 0);
  const minute = Number(m[5] ?? 0);
  const second = Number(m[6] ?? 0);
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}+07:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function validatePnjResponse(body: unknown): PnjGoldPriceResponse {
  if (!body || typeof body !== "object") {
    throw new Error("PNJ response không hợp lệ");
  }
  const r = body as Record<string, unknown>;
  if (!Array.isArray(r.data)) {
    throw new Error("PNJ response thiếu mảng data");
  }
  return {
    data: r.data as PnjGoldPriceItem[],
    chinhanh: typeof r.chinhanh === "string" ? r.chinhanh : "",
    updateDate: typeof r.updateDate === "string" ? r.updateDate : "",
    note: typeof r.note === "string" ? r.note : undefined,
    color_note: typeof r.color_note === "string" ? r.color_note : undefined,
  };
}

export function normalizePnjItem(
  item: PnjGoldPriceItem,
  ctx: {
    source: GoldPriceSource;
    zone: string;
    branch: string;
    capturedAt: string;
    sourceUpdatedAt: string | null;
    note?: string;
  },
): GoldPrice | null {
  const sourceCode = String(item.masp ?? "").trim();
  const sourceName = String(item.tensp ?? "").trim();
  if (!sourceCode || !sourceName) return null;

  return {
    source: ctx.source,
    sourceCode,
    sourceName,
    buyPricePerChi: parsePnjRawPrice(item.giamua),
    sellPricePerChi: parsePnjRawPrice(item.giaban),
    unit: "VND_PER_CHI",
    branch: ctx.branch,
    zone: ctx.zone,
    capturedAt: ctx.capturedAt,
    sourceUpdatedAt: ctx.sourceUpdatedAt,
    note: item.note ?? ctx.note,
  };
}

export function normalizePnjResponse(
  raw: PnjGoldPriceResponse,
  zone: string,
  capturedAt: string = new Date().toISOString(),
): GoldPriceResult {
  const sourceUpdatedAt = parsePnjUpdateDate(raw.updateDate);
  const branch = (raw.chinhanh || "").trim() || "unknown";
  const prices: GoldPrice[] = [];
  for (const item of raw.data) {
    const n = normalizePnjItem(item, {
      source: "PNJ",
      zone,
      branch,
      capturedAt,
      sourceUpdatedAt,
      note: raw.note,
    });
    if (n) prices.push(n);
  }
  if (prices.length === 0) {
    throw new Error("PNJ response không có sản phẩm giá hợp lệ");
  }
  return {
    source: "PNJ",
    zone,
    branch,
    sourceUpdatedAt,
    capturedAt,
    note: raw.note,
    prices,
  };
}

export function toSnapshotPrices(
  prices: GoldPrice[],
): GoldPriceSnapshotPrice[] {
  return prices.map((p) => ({
    sourceCode: p.sourceCode,
    sourceName: p.sourceName,
    buyPricePerChi: p.buyPricePerChi,
    sellPricePerChi: p.sellPricePerChi,
  }));
}

/** Prefer codes for mirroring into AssetSettings.goldReferencePricePerChi.9999 */
export const PREFERRED_9999_CODES = ["N24K", "SJC", "PNJ", "24K", "999"] as const;

/** Prefer codes for 18k map. */
export const PREFERRED_18K_CODES = ["75", "18K", "18k"] as const;

export function pickBuyPriceByCodes(
  prices: GoldPriceSnapshotPrice[] | GoldPrice[],
  preferred: readonly string[],
): number | null {
  for (const code of preferred) {
    const hit = prices.find(
      (p) => p.sourceCode.toUpperCase() === code.toUpperCase(),
    );
    if (hit?.buyPricePerChi != null && hit.buyPricePerChi > 0) {
      return hit.buyPricePerChi;
    }
  }
  return null;
}

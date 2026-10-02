import { randomUUID } from "node:crypto";
import { fuelPriceSnapshotsCol } from "../mongo.js";
import {
  computeStale,
  getFuelPriceRegion,
  getFuelSource,
  isFuelSyncEnabled,
} from "./config.js";
import {
  FuelPriceError,
  fuelPriceErrorToClient,
  mapFuelSourceError,
} from "./errors.js";
import { computeFuelPriceRawHash } from "./hash.js";
import { REQUIRED_FUEL_CODES } from "./normalize.js";
import { fetchPetrolimexFuelPrices } from "./sources/petrolimex/petrolimex.client.js";
import { FuelSourceError } from "./sources/petrolimex/petrolimex.types.js";
import {
  discoverAvailableDates,
  fetchPriceView,
} from "./pvoil-client.js";
import { parsePvoilFuelPriceHtml } from "./parser.js";
import { parsePvoilEffectiveDate } from "./normalize.js";
import { validateFuelProducts } from "./validate.js";
import type {
  FuelPriceSnapshot,
  FuelPriceSource,
  FuelPriceTripSnapshot,
  FuelSyncResult,
  FuelSyncTrigger,
} from "./types.js";

const PARSER_VERSION = "petrolimex-v1";

function assessPetrolimexProducts(products: FuelPriceSnapshot["products"]): {
  ok: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  for (const required of REQUIRED_FUEL_CODES) {
    if (!products.some((p) => p.code === required && !p.unknown && p.price > 0)) {
      warnings.push(`Thiếu sản phẩm bắt buộc: ${required}`);
    }
  }
  return { ok: warnings.length === 0, warnings };
}

export async function findSnapshotByEffectiveAt(
  effectiveAt: string,
  source: FuelPriceSource = getFuelSource(),
): Promise<FuelPriceSnapshot | null> {
  const col = await fuelPriceSnapshotsCol();
  const doc = await col.findOne({ source, effectiveAt });
  return doc ?? null;
}

export async function findLatestFuelPriceSnapshot(
  source: FuelPriceSource = getFuelSource(),
): Promise<FuelPriceSnapshot | null> {
  const col = await fuelPriceSnapshotsCol();
  const docs = await col
    .find({
      source,
      $or: [{ status: "SUCCESS" }, { status: { $exists: false } }],
    })
    .sort({ effectiveAt: -1, updatedAt: -1 })
    .limit(1)
    .toArray();
  return docs[0] ?? null;
}

async function persistSnapshot(params: {
  source: FuelPriceSource;
  effectiveAt: string;
  effectiveDateRaw: string;
  products: FuelPriceSnapshot["products"];
  sourceUrl: string;
  effectiveTimeSource?: FuelPriceSnapshot["effectiveTimeSource"];
  parserVersion?: string;
  rawHash?: string;
  region?: FuelPriceSnapshot["region"];
}): Promise<{ snapshot: FuelPriceSnapshot; inserted: boolean }> {
  const now = new Date().toISOString();
  const doc: FuelPriceSnapshot = {
    id: randomUUID(),
    source: params.source,
    effectiveAt: params.effectiveAt,
    effectiveDateRaw: params.effectiveDateRaw,
    products: params.products,
    sourceUrl: params.sourceUrl,
    crawledAt: now,
    createdAt: now,
    updatedAt: now,
    effectiveTimeSource: params.effectiveTimeSource,
    parserVersion: params.parserVersion,
    rawHash: params.rawHash,
    status: "SUCCESS",
    lastCheckedAt: now,
    region: params.region,
  };
  const col = await fuelPriceSnapshotsCol();
  const existing = await findSnapshotByEffectiveAt(
    params.effectiveAt,
    params.source,
  );
  try {
    await col.updateOne(
      { source: params.source, effectiveAt: params.effectiveAt },
      {
        $setOnInsert: {
          id: doc.id,
          source: doc.source,
          effectiveAt: doc.effectiveAt,
          createdAt: doc.createdAt,
        },
        $set: {
          effectiveDateRaw: doc.effectiveDateRaw,
          products: doc.products,
          sourceUrl: doc.sourceUrl,
          crawledAt: doc.crawledAt,
          updatedAt: doc.updatedAt,
          effectiveTimeSource: doc.effectiveTimeSource,
          parserVersion: doc.parserVersion,
          rawHash: doc.rawHash,
          status: doc.status,
          lastCheckedAt: doc.lastCheckedAt,
          region: doc.region,
        },
      },
      { upsert: true },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/duplicate|E11000/i.test(msg)) {
      const again = await findSnapshotByEffectiveAt(
        params.effectiveAt,
        params.source,
      );
      if (again) return { snapshot: again, inserted: false };
    }
    throw new FuelPriceError(
      "FUEL_SOURCE_DATABASE_ERROR",
      e instanceof Error ? e.message : String(e),
    );
  }
  const saved = await findSnapshotByEffectiveAt(
    params.effectiveAt,
    params.source,
  );
  return { snapshot: saved ?? doc, inserted: !existing };
}

/**
 * Primary sync entry: Petrolimex when FUEL_PRICE_PROVIDER=PETROLIMEX.
 */
export async function syncLatestFuelPrice(params?: {
  trigger?: FuelSyncTrigger;
}): Promise<FuelSyncResult> {
  if (!isFuelSyncEnabled()) {
    throw new FuelPriceError("FUEL_SYNC_DISABLED");
  }

  const source = getFuelSource();
  const trigger = params?.trigger ?? "ADMIN";

  if (source === "PVOIL") {
    /** @deprecated path — only if FUEL_PRICE_PROVIDER=PVOIL */
    return syncLatestPvoilFuelPrice();
  }

  const started = Date.now();
  const region = getFuelPriceRegion();

  try {
    const parsed = await fetchPetrolimexFuelPrices();
    const assessment = assessPetrolimexProducts(parsed.products);
    const warnings = [...parsed.warnings, ...assessment.warnings];

    if (!assessment.ok) {
      console.error("[FUEL_PRICE]", {
        provider: "PETROLIMEX",
        status: "FAILED",
        reason: "missing_required_products",
        warnings,
      });
      throw new FuelPriceError(
        "FUEL_SOURCE_INVALID_DATA",
        warnings.join("; ") || "Thiếu sản phẩm bắt buộc",
      );
    }

    const rawHash = computeFuelPriceRawHash({
      provider: "PETROLIMEX",
      effectiveAt: parsed.effectiveAt,
      products: parsed.products,
    });

    const latest = await findLatestFuelPriceSnapshot("PETROLIMEX");
    if (latest?.rawHash === rawHash) {
      const now = new Date().toISOString();
      const col = await fuelPriceSnapshotsCol();
      await col.updateOne(
        { id: latest.id },
        { $set: { lastCheckedAt: now, updatedAt: now } },
      );
      const stale = computeStale(latest.crawledAt);
      console.info("[FUEL_PRICE]", {
        provider: "PETROLIMEX",
        status: "SUCCESS",
        products: latest.products.length,
        effectiveAt: latest.effectiveAt,
        changed: false,
        durationMs: Date.now() - started,
        trigger,
      });
      return {
        success: true,
        status: "already_synced",
        source: "PETROLIMEX",
        provider: "PETROLIMEX",
        effectiveAt: latest.effectiveAt,
        effectiveDateRaw: latest.effectiveDateRaw,
        productCount: latest.products.length,
        products: latest.products,
        crawledAt: latest.crawledAt,
        changed: false,
        warnings,
        isStale: stale.isStale,
        staleHours: stale.staleHours,
        region,
        message: "Giá Petrolimex chưa đổi — bỏ qua ghi lịch sử mới",
      };
    }

    const { snapshot, inserted } = await persistSnapshot({
      source: "PETROLIMEX",
      effectiveAt: parsed.effectiveAt,
      effectiveDateRaw: parsed.effectiveDateRaw,
      products: parsed.products,
      sourceUrl: parsed.sourceUrl,
      effectiveTimeSource: parsed.effectiveTimeSource,
      parserVersion: PARSER_VERSION,
      rawHash,
      region,
    });

    const stale = computeStale(snapshot.crawledAt);
    console.info("[FUEL_PRICE]", {
      provider: "PETROLIMEX",
      status: "SUCCESS",
      products: snapshot.products.length,
      effectiveAt: snapshot.effectiveAt,
      changed: inserted,
      durationMs: Date.now() - started,
      trigger,
    });

    return {
      success: true,
      status: inserted ? "synced" : "already_synced",
      source: "PETROLIMEX",
      provider: "PETROLIMEX",
      effectiveAt: snapshot.effectiveAt,
      effectiveDateRaw: snapshot.effectiveDateRaw,
      productCount: snapshot.products.length,
      products: snapshot.products,
      crawledAt: snapshot.crawledAt,
      changed: inserted,
      warnings,
      isStale: stale.isStale,
      staleHours: stale.staleHours,
      region,
      message: inserted
        ? "Đồng bộ giá xăng Petrolimex thành công"
        : "Đã cập nhật metadata snapshot Petrolimex",
    };
  } catch (e) {
    const client = fuelPriceErrorToClient(e);
    console.error("[FUEL_PRICE]", {
      provider: "PETROLIMEX",
      status: "FAILED",
      reason: client.code,
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - started,
      trigger,
    });
    if (e instanceof FuelSourceError) throw mapFuelSourceError(e);
    if (e instanceof FuelPriceError) throw e;
    throw new FuelPriceError("SOURCE_UNAVAILABLE", client.message);
  }
}

/** @deprecated Use syncLatestFuelPrice */
export async function syncPvoilDate(rawDate: string): Promise<FuelSyncResult> {
  const started = Date.now();
  const effectiveAt = parsePvoilEffectiveDate(rawDate);
  if (!effectiveAt) {
    throw new FuelPriceError(
      "PVOIL_VALIDATION_FAILED",
      "Ngày không đúng định dạng DD/MM/YYYY HH:mm:ss",
    );
  }

  const existing = await findSnapshotByEffectiveAt(effectiveAt, "PVOIL");
  if (existing) {
    return {
      success: true,
      status: "already_synced",
      source: "PVOIL",
      provider: "PVOIL",
      effectiveAt: existing.effectiveAt,
      effectiveDateRaw: existing.effectiveDateRaw,
      productCount: existing.products.length,
      products: existing.products,
      crawledAt: existing.crawledAt,
      changed: false,
    };
  }

  const { html, sourceUrl } = await fetchPriceView(rawDate);
  const products = parsePvoilFuelPriceHtml(html, effectiveAt);
  validateFuelProducts(products, effectiveAt);

  const { snapshot } = await persistSnapshot({
    source: "PVOIL",
    effectiveAt,
    effectiveDateRaw: rawDate.trim(),
    products,
    sourceUrl,
  });

  console.info("[fuel-price] pvoil_sync_success", {
    effectiveAt: snapshot.effectiveAt,
    durationMs: Date.now() - started,
  });

  return {
    success: true,
    status: "synced",
    source: "PVOIL",
    provider: "PVOIL",
    effectiveAt: snapshot.effectiveAt,
    effectiveDateRaw: snapshot.effectiveDateRaw,
    productCount: snapshot.products.length,
    products: snapshot.products,
    crawledAt: snapshot.crawledAt,
    changed: true,
  };
}

/** @deprecated Use syncLatestFuelPrice */
export async function syncLatestPvoilFuelPrice(): Promise<FuelSyncResult> {
  try {
    const dates = await discoverAvailableDates();
    const latest = dates[0];
    if (!latest) {
      throw new FuelPriceError("PVOIL_NO_AVAILABLE_DATES");
    }
    return await syncPvoilDate(latest.rawDate);
  } catch (e) {
    const client = fuelPriceErrorToClient(e);
    if (e instanceof FuelPriceError) throw e;
    throw new FuelPriceError("PVOIL_FETCH_FAILED", client.message);
  }
}

export async function listFuelPriceHistory(params: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}): Promise<{
  items: FuelPriceSnapshot[];
  page: number;
  limit: number;
  total: number;
}> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
  const source = getFuelSource();
  const filter: Record<string, unknown> = { source };
  if (params.from || params.to) {
    const range: Record<string, string> = {};
    if (params.from) range.$gte = params.from;
    if (params.to) range.$lte = params.to;
    filter.effectiveAt = range;
  }
  const col = await fuelPriceSnapshotsCol();
  const total = await col.countDocuments(filter);
  const items = await col
    .find(filter)
    .sort({ effectiveAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
  return { items, page, limit, total };
}

export async function getFuelPriceSnapshot(
  code: string,
): Promise<FuelPriceTripSnapshot | null> {
  const latest = await findLatestFuelPriceSnapshot();
  if (!latest) return null;
  const product = latest.products.find(
    (p) => p.code.toUpperCase() === code.toUpperCase(),
  );
  if (!product || !(product.price > 0)) return null;
  return {
    fuelType: String(product.code),
    fuelPrice: product.price,
    fuelPriceSource: latest.source,
    fuelPriceEffectiveAt: latest.effectiveAt,
  };
}

/**
 * As-of price from Mongo for configured FUEL_PRICE_PROVIDER.
 * Never crawls.
 */
export async function getFuelPriceForDate(
  fuelType: string,
  departureAt: string,
): Promise<FuelPriceTripSnapshot | null> {
  const asOf = new Date(departureAt);
  if (Number.isNaN(asOf.getTime())) return null;
  const asOfIso = asOf.toISOString();
  const source = getFuelSource();
  const col = await fuelPriceSnapshotsCol();
  const docs = await col
    .find({
      source,
      effectiveAt: { $lte: asOfIso },
      $or: [{ status: "SUCCESS" }, { status: { $exists: false } }],
    })
    .sort({ effectiveAt: -1, updatedAt: -1 })
    .limit(1)
    .toArray();
  const snap = docs[0];
  if (!snap) return null;
  const product = snap.products.find(
    (p) => p.code.toUpperCase() === fuelType.toUpperCase(),
  );
  if (!product || !(product.price > 0) || product.unknown) return null;
  return {
    fuelType: String(product.code),
    fuelPrice: product.price,
    fuelPriceSource: snap.source,
    fuelPriceEffectiveAt: snap.effectiveAt,
  };
}

export function toPublicFuelSnapshot(doc: FuelPriceSnapshot) {
  const stale = computeStale(doc.crawledAt);
  return {
    source: doc.source,
    provider: doc.source,
    effectiveAt: doc.effectiveAt,
    effectiveDateRaw: doc.effectiveDateRaw,
    crawledAt: doc.crawledAt,
    sourceUrl: doc.sourceUrl,
    region: doc.region ?? getFuelPriceRegion(),
    status: doc.status ?? "SUCCESS",
    effectiveTimeSource: doc.effectiveTimeSource,
    isStale: stale.isStale,
    staleHours: stale.staleHours,
    products: doc.products.map((p) => ({
      code: p.code,
      name: p.name,
      price: p.price,
      change: p.change,
      unit: p.unit,
      grade: p.grade,
      region1Price: p.region1Price,
      region2Price: p.region2Price,
    })),
  };
}

import { randomUUID } from "node:crypto";
import { fuelPriceSnapshotsCol } from "../mongo.js";
import { FuelPriceError, fuelPriceErrorToClient } from "./errors.js";
import {
  discoverAvailableDates,
  fetchPriceView,
} from "./pvoil-client.js";
import { parsePvoilFuelPriceHtml } from "./parser.js";
import { parsePvoilEffectiveDate } from "./normalize.js";
import { validateFuelProducts } from "./validate.js";
import type {
  FuelPriceSnapshot,
  FuelPriceTripSnapshot,
  FuelSyncResult,
} from "./types.js";

export async function findSnapshotByEffectiveAt(
  effectiveAt: string,
): Promise<FuelPriceSnapshot | null> {
  const col = await fuelPriceSnapshotsCol();
  const doc = await col.findOne({ source: "PVOIL", effectiveAt });
  return doc ?? null;
}

export async function findLatestFuelPriceSnapshot(): Promise<FuelPriceSnapshot | null> {
  const col = await fuelPriceSnapshotsCol();
  const docs = await col
    .find({ source: "PVOIL" })
    .sort({ effectiveAt: -1 })
    .limit(1)
    .toArray();
  return docs[0] ?? null;
}

async function persistSnapshot(params: {
  effectiveAt: string;
  effectiveDateRaw: string;
  products: FuelPriceSnapshot["products"];
  sourceUrl: string;
}): Promise<FuelPriceSnapshot> {
  const now = new Date().toISOString();
  const doc: FuelPriceSnapshot = {
    id: randomUUID(),
    source: "PVOIL",
    effectiveAt: params.effectiveAt,
    effectiveDateRaw: params.effectiveDateRaw,
    products: params.products,
    sourceUrl: params.sourceUrl,
    crawledAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const col = await fuelPriceSnapshotsCol();
  try {
    await col.updateOne(
      { source: "PVOIL", effectiveAt: params.effectiveAt },
      {
        $setOnInsert: {
          id: doc.id,
          source: doc.source,
          effectiveAt: doc.effectiveAt,
          effectiveDateRaw: doc.effectiveDateRaw,
          createdAt: doc.createdAt,
        },
        $set: {
          products: doc.products,
          sourceUrl: doc.sourceUrl,
          crawledAt: doc.crawledAt,
          updatedAt: doc.updatedAt,
        },
      },
      { upsert: true },
    );
  } catch (e) {
    // Race on unique index — treat as already synced
    const msg = e instanceof Error ? e.message : String(e);
    if (/duplicate|E11000/i.test(msg)) {
      const existing = await findSnapshotByEffectiveAt(params.effectiveAt);
      if (existing) return existing;
    }
    throw new FuelPriceError(
      "MONGODB_ERROR",
      e instanceof Error ? e.message : String(e),
    );
  }
  const saved = await findSnapshotByEffectiveAt(params.effectiveAt);
  return saved ?? doc;
}

export async function syncPvoilDate(rawDate: string): Promise<FuelSyncResult> {
  const started = Date.now();
  const effectiveAt = parsePvoilEffectiveDate(rawDate);
  if (!effectiveAt) {
    throw new FuelPriceError(
      "PVOIL_VALIDATION_FAILED",
      "Ngày không đúng định dạng DD/MM/YYYY HH:mm:ss",
    );
  }

  const existing = await findSnapshotByEffectiveAt(effectiveAt);
  if (existing) {
    console.info("[fuel-price] pvoil_sync_already_exists", {
      event: "pvoil_sync_already_exists",
      effectiveAt,
      at: new Date().toISOString(),
    });
    return {
      status: "already_synced",
      source: "PVOIL",
      effectiveAt: existing.effectiveAt,
      effectiveDateRaw: existing.effectiveDateRaw,
      productCount: existing.products.length,
      products: existing.products,
      crawledAt: existing.crawledAt,
    };
  }

  const { html, sourceUrl } = await fetchPriceView(rawDate);
  const products = parsePvoilFuelPriceHtml(html, effectiveAt);
  console.info("[fuel-price] pvoil_price_parsed", {
    event: "pvoil_price_parsed",
    effectiveAt,
    productCount: products.length,
    at: new Date().toISOString(),
  });
  validateFuelProducts(products, effectiveAt);

  const saved = await persistSnapshot({
    effectiveAt,
    effectiveDateRaw: rawDate.trim(),
    products,
    sourceUrl,
  });

  console.info("[fuel-price] pvoil_sync_success", {
    event: "pvoil_sync_success",
    effectiveAt: saved.effectiveAt,
    productCount: saved.products.length,
    durationMs: Date.now() - started,
    at: new Date().toISOString(),
  });

  return {
    status: "synced",
    source: "PVOIL",
    effectiveAt: saved.effectiveAt,
    effectiveDateRaw: saved.effectiveDateRaw,
    productCount: saved.products.length,
    products: saved.products,
    crawledAt: saved.crawledAt,
  };
}

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
    console.error("[fuel-price] pvoil_sync_failed", {
      event: "pvoil_sync_failed",
      code: client.code,
      error: e instanceof Error ? e.message : String(e),
      at: new Date().toISOString(),
    });
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
  const filter: Record<string, unknown> = { source: "PVOIL" };
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

/** Latest snapshot product price (not date-aware). Prefer getFuelPriceForDate for quotes. */
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
    fuelPriceSource: "PVOIL",
    fuelPriceEffectiveAt: latest.effectiveAt,
  };
}

/**
 * Historical PVOIL price: latest snapshot with effectiveAt <= departureAt.
 * Does not crawl PVOIL and does not fall back to "current" if none found.
 */
export async function getFuelPriceForDate(
  fuelType: string,
  departureAt: string,
): Promise<FuelPriceTripSnapshot | null> {
  const asOf = new Date(departureAt);
  if (Number.isNaN(asOf.getTime())) return null;
  const asOfIso = asOf.toISOString();
  const col = await fuelPriceSnapshotsCol();
  const docs = await col
    .find({ source: "PVOIL", effectiveAt: { $lte: asOfIso } })
    .sort({ effectiveAt: -1 })
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
    fuelPriceSource: "PVOIL",
    fuelPriceEffectiveAt: snap.effectiveAt,
  };
}

export function toPublicFuelSnapshot(doc: FuelPriceSnapshot) {
  return {
    source: doc.source,
    effectiveAt: doc.effectiveAt,
    effectiveDateRaw: doc.effectiveDateRaw,
    crawledAt: doc.crawledAt,
    products: doc.products.map((p) => ({
      code: p.code,
      name: p.name,
      price: p.price,
      change: p.change,
      unit: p.unit,
    })),
  };
}

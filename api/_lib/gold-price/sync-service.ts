import { randomUUID } from "node:crypto";
import {
  assetSettingsCol,
  goldPriceSnapshotsCol,
  goldTypesCol,
} from "../mongo.js";
import {
  pickBuyPriceByCodes,
  PREFERRED_18K_CODES,
  PREFERRED_9999_CODES,
  toSnapshotPrices,
} from "./normalize.js";
import {
  createDefaultGoldPriceProvider,
  getPnjZone,
} from "./pnj-provider.js";
import type {
  GoldPrice,
  GoldPriceProvider,
  GoldPriceResult,
  GoldPriceSnapshot,
  GoldTypeCatalogEntry,
} from "./types.js";

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export function getGoldPriceCacheTtlMs(): number {
  const raw = Number(process.env.GOLD_PRICE_CACHE_TTL_MS);
  if (Number.isFinite(raw) && raw >= 60_000) return raw;
  return DEFAULT_TTL_MS;
}

function snapshotToResult(
  snap: GoldPriceSnapshot,
  opts?: { stale?: boolean },
): GoldPriceResult {
  const prices: GoldPrice[] = snap.prices.map((p) => ({
    source: snap.source,
    sourceCode: p.sourceCode,
    sourceName: p.sourceName,
    buyPricePerChi: p.buyPricePerChi,
    sellPricePerChi: p.sellPricePerChi,
    unit: "VND_PER_CHI" as const,
    branch: snap.branch,
    zone: snap.zone,
    capturedAt: snap.capturedAt,
    sourceUpdatedAt: snap.sourceUpdatedAt,
    note: snap.note,
  }));
  return {
    source: snap.source,
    zone: snap.zone,
    branch: snap.branch,
    sourceUpdatedAt: snap.sourceUpdatedAt,
    capturedAt: snap.capturedAt,
    note: snap.note,
    prices,
    stale: opts?.stale,
  };
}

export async function findLatestSnapshot(
  source: "PNJ",
  zone: string,
): Promise<GoldPriceSnapshot | null> {
  const col = await goldPriceSnapshotsCol();
  const docs = await col
    .find({ source, zone })
    .sort({ capturedAt: -1 })
    .limit(1)
    .toArray();
  return docs[0] ?? null;
}

function isFresh(snap: GoldPriceSnapshot, ttlMs: number): boolean {
  const captured = new Date(snap.capturedAt).getTime();
  if (!Number.isFinite(captured)) return false;
  return Date.now() - captured < ttlMs;
}

export async function mirrorPricesToAssetSettings(
  prices: GoldPriceSnapshot["prices"],
): Promise<void> {
  const price9999 = pickBuyPriceByCodes(prices, PREFERRED_9999_CODES);
  const price18k = pickBuyPriceByCodes(prices, PREFERRED_18K_CODES);
  if (price9999 == null && price18k == null) return;

  const col = await assetSettingsCol();
  const $set: Record<string, number | string> = {
    updatedAt: new Date().toISOString(),
  };
  if (price9999 != null) {
    $set["goldReferencePricePerChi.9999"] = price9999;
  }
  if (price18k != null) {
    $set["goldReferencePricePerChi.18k"] = price18k;
  }
  await col.updateOne({ id: "default" }, { $set }, { upsert: false });
}

/** Upsert each PNJ product into gold_types catalog (unique by source + sourceCode). */
export async function upsertGoldTypesFromResult(
  result: GoldPriceResult,
): Promise<number> {
  if (result.prices.length === 0) return 0;
  const col = await goldTypesCol();
  const now = result.capturedAt || new Date().toISOString();
  const ops = result.prices.map((p) => {
    const filter = { source: result.source, sourceCode: p.sourceCode };
    const $set: Omit<GoldTypeCatalogEntry, "id" | "createdAt"> = {
      source: result.source,
      sourceCode: p.sourceCode,
      sourceName: p.sourceName,
      zone: result.zone,
      branch: result.branch,
      lastBuyPricePerChi: p.buyPricePerChi,
      lastSellPricePerChi: p.sellPricePerChi,
      lastSourceUpdatedAt: result.sourceUpdatedAt,
      lastSeenAt: now,
      updatedAt: now,
    };
    return {
      updateOne: {
        filter,
        update: {
          $set,
          $setOnInsert: {
            id: randomUUID(),
            createdAt: now,
          },
        },
        upsert: true,
      },
    };
  });
  const res = await col.bulkWrite(ops, { ordered: false });
  return (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
}

export async function saveGoldPriceSnapshot(
  result: GoldPriceResult,
): Promise<GoldPriceSnapshot> {
  const doc: GoldPriceSnapshot = {
    id: randomUUID(),
    source: result.source,
    zone: result.zone,
    branch: result.branch,
    sourceUpdatedAt: result.sourceUpdatedAt,
    capturedAt: result.capturedAt,
    note: result.note,
    prices: toSnapshotPrices(result.prices),
  };
  const col = await goldPriceSnapshotsCol();
  await col.insertOne(doc);
  try {
    await upsertGoldTypesFromResult(result);
  } catch (e) {
    console.error("[gold-price] upsert gold_types failed", {
      error: e instanceof Error ? e.message : String(e),
      at: new Date().toISOString(),
    });
  }
  try {
    await mirrorPricesToAssetSettings(doc.prices);
  } catch (e) {
    console.error("[gold-price] mirror AssetSettings failed", {
      error: e instanceof Error ? e.message : String(e),
      at: new Date().toISOString(),
    });
  }
  return doc;
}

export type GetGoldPricesOptions = {
  zone?: string;
  source?: string;
  code?: string;
  forceRefresh?: boolean;
  provider?: GoldPriceProvider;
};

/**
 * Cache-aware gold prices. Never throws for upstream failure when a snapshot exists.
 * Throws only when no snapshot and fetch failed (caller maps to 503).
 */
export async function getGoldPrices(
  options: GetGoldPricesOptions = {},
): Promise<GoldPriceResult> {
  const zone = getPnjZone(options.zone);
  const source = (options.source ?? "PNJ").toUpperCase() === "PNJ" ? "PNJ" : "PNJ";
  const ttlMs = getGoldPriceCacheTtlMs();
  const latest = await findLatestSnapshot(source, zone);

  if (
    !options.forceRefresh &&
    latest &&
    isFresh(latest, ttlMs)
  ) {
    return filterResult(snapshotToResult(latest), options.code);
  }

  const provider = options.provider ?? createDefaultGoldPriceProvider();
  try {
    const fetched = await provider.getPrices({ zone });
    const saved = await saveGoldPriceSnapshot(fetched);
    return filterResult(snapshotToResult(saved), options.code);
  } catch (e) {
    console.error("[gold-price] PNJ fetch failed", {
      source,
      zone,
      error: e instanceof Error ? e.message : String(e),
      at: new Date().toISOString(),
    });
    if (latest) {
      return filterResult(snapshotToResult(latest, { stale: true }), options.code);
    }
    throw new Error(
      e instanceof Error
        ? `Chưa có giá vàng trong cache và không lấy được từ PNJ: ${e.message}`
        : "Chưa có giá vàng trong cache và không lấy được từ PNJ",
    );
  }
}

function filterResult(
  result: GoldPriceResult,
  code?: string,
): GoldPriceResult {
  const c = code?.trim();
  if (!c) return result;
  return {
    ...result,
    prices: result.prices.filter(
      (p) => p.sourceCode.toUpperCase() === c.toUpperCase(),
    ),
  };
}

export async function forceSyncGoldPrices(options?: {
  zone?: string;
  provider?: GoldPriceProvider;
}): Promise<GoldPriceResult> {
  return getGoldPrices({
    zone: options?.zone,
    forceRefresh: true,
    provider: options?.provider,
  });
}

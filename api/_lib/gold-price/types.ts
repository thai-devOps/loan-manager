/** PNJ / gold market price types (server + shared normalize). */

export interface PnjGoldPriceItem {
  masp: string;
  tensp: string;
  giaban: number | string;
  giamua: number | string;
  note?: string;
  color_note?: string;
}

export interface PnjGoldPriceResponse {
  data: PnjGoldPriceItem[];
  chinhanh: string;
  updateDate: string;
  note?: string;
  color_note?: string;
}

export type GoldPriceSource = "PNJ";

export interface GoldPrice {
  source: GoldPriceSource;
  sourceCode: string;
  sourceName: string;
  buyPricePerChi: number | null;
  sellPricePerChi: number | null;
  unit: "VND_PER_CHI";
  branch: string;
  zone: string;
  capturedAt: string;
  sourceUpdatedAt: string | null;
  note?: string;
}

export interface GoldPriceSnapshotPrice {
  sourceCode: string;
  sourceName: string;
  buyPricePerChi: number | null;
  sellPricePerChi: number | null;
}

export interface GoldPriceSnapshot {
  id: string;
  source: GoldPriceSource;
  zone: string;
  branch: string;
  sourceUpdatedAt: string | null;
  capturedAt: string;
  note?: string;
  prices: GoldPriceSnapshotPrice[];
}

/** Catalog of gold products seen from a provider (upserted on each successful sync). */
export interface GoldTypeCatalogEntry {
  id: string;
  source: GoldPriceSource;
  sourceCode: string;
  sourceName: string;
  zone: string;
  branch: string;
  lastBuyPricePerChi: number | null;
  lastSellPricePerChi: number | null;
  lastSourceUpdatedAt: string | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoldPriceResult {
  source: GoldPriceSource;
  zone: string;
  branch: string;
  sourceUpdatedAt: string | null;
  capturedAt: string;
  note?: string;
  prices: GoldPrice[];
  stale?: boolean;
}

export interface GoldPriceProvider {
  getPrices(options?: { zone?: string }): Promise<GoldPriceResult>;
}

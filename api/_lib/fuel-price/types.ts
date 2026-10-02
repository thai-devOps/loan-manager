export type FuelPriceSource = "PVOIL";

export type FuelProductCode =
  | "E10_RON95_III"
  | "E5_RON92_II"
  | "DO_005S_II"
  | "DO_0001S_V"
  | "UNKNOWN";

export interface FuelPriceProduct {
  code: FuelProductCode | string;
  name: string;
  price: number;
  change: number | null;
  unit: "VND/L";
  unknown?: boolean;
}

export interface FuelPriceSnapshot {
  id: string;
  source: FuelPriceSource;
  effectiveAt: string;
  effectiveDateRaw: string;
  products: FuelPriceProduct[];
  sourceUrl: string;
  crawledAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PvoilAvailableDate {
  rawDate: string;
  effectiveAt: string;
  displayDate: string;
}

export type FuelSyncStatus = "synced" | "already_synced" | "failed";

export interface FuelSyncResult {
  status: FuelSyncStatus;
  source: FuelPriceSource;
  effectiveAt?: string;
  effectiveDateRaw?: string;
  productCount?: number;
  products?: FuelPriceProduct[];
  crawledAt?: string;
  code?: string;
  message?: string;
}

export interface FuelPriceTripSnapshot {
  fuelType: string;
  fuelPrice: number;
  fuelPriceSource: FuelPriceSource;
  fuelPriceEffectiveAt: string;
}

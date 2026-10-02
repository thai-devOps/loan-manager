export type FuelPriceSource = "PETROLIMEX" | "PVOIL";

export type FuelPriceRegion = "REGION_1" | "REGION_2";

export type FuelProductCode =
  | "E10_RON95_III"
  | "E10_RON95_V"
  | "E5_RON92_II"
  | "DO_005S_II"
  | "DO_0001S_V"
  | "KEROSENE"
  | "UNKNOWN";

export interface FuelPriceProduct {
  code: FuelProductCode | string;
  name: string;
  price: number;
  change: number | null;
  unit: "VND/L";
  grade?: string;
  region1Price?: number;
  region2Price?: number;
  unknown?: boolean;
}

export type EffectiveTimeSource = "SOURCE" | "CRAWL_TIME";

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
  effectiveTimeSource?: EffectiveTimeSource;
  parserVersion?: string;
  rawHash?: string;
  status?: "SUCCESS" | "FAILED";
  lastCheckedAt?: string;
  region?: FuelPriceRegion;
}

export interface PvoilAvailableDate {
  rawDate: string;
  effectiveAt: string;
  displayDate: string;
}

export type FuelSyncStatus =
  | "synced"
  | "already_synced"
  | "failed";

export type FuelSyncTrigger = "CRON" | "ADMIN";

export interface FuelSyncResult {
  success: boolean;
  status: FuelSyncStatus;
  source: FuelPriceSource;
  provider?: FuelPriceSource;
  effectiveAt?: string;
  effectiveDateRaw?: string;
  productCount?: number;
  products?: FuelPriceProduct[];
  crawledAt?: string;
  changed?: boolean;
  code?: string;
  message?: string;
  warnings?: string[];
  isStale?: boolean;
  staleHours?: number;
  region?: FuelPriceRegion;
}

export interface FuelPriceTripSnapshot {
  fuelType: string;
  fuelPrice: number;
  fuelPriceSource: FuelPriceSource;
  fuelPriceEffectiveAt: string;
}

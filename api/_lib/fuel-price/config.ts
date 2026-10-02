import type { FuelPriceRegion, FuelPriceSource } from "./types.js";

export const DEFAULT_PETROLIMEX_FUEL_PRICE_URL =
  "https://www.petrolimex.com.vn/index.html";

export function getFuelSource(): FuelPriceSource {
  const raw = (
    process.env.FUEL_PRICE_PROVIDER ??
    process.env.FUEL_SOURCE ??
    "PETROLIMEX"
  )
    .trim()
    .toUpperCase();
  if (raw === "PVOIL") return "PVOIL";
  return "PETROLIMEX";
}

export function getPetrolimexFuelPriceUrl(): string {
  const raw = (process.env.PETROLIMEX_FUEL_PRICE_URL ?? "").trim();
  return raw || DEFAULT_PETROLIMEX_FUEL_PRICE_URL;
}

export function getFuelSourceTimeoutMs(): number {
  const n = Number(process.env.FUEL_SOURCE_TIMEOUT_MS);
  if (Number.isFinite(n) && n >= 3_000 && n <= 55_000) return Math.round(n);
  return 10_000;
}

export function getFuelPriceRegion(): FuelPriceRegion {
  const raw = (process.env.FUEL_PRICE_REGION ?? "REGION_1").trim().toUpperCase();
  if (raw === "REGION_2" || raw === "VUNG_2" || raw === "2") return "REGION_2";
  return "REGION_1";
}

export function getFuelPriceStaleAfterHours(): number {
  const n = Number(process.env.FUEL_PRICE_STALE_AFTER_HOURS);
  if (Number.isFinite(n) && n >= 1 && n <= 720) return n;
  return 48;
}

export function isFuelSyncEnabled(): boolean {
  const raw = (process.env.FUEL_SYNC_ENABLED ?? "true").trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "off" || raw === "no");
}

export function computeStale(syncedOrEffectiveAt: string): {
  isStale: boolean;
  staleHours: number;
} {
  const t = new Date(syncedOrEffectiveAt).getTime();
  if (Number.isNaN(t)) return { isStale: true, staleHours: 0 };
  const hours = (Date.now() - t) / (1000 * 60 * 60);
  const threshold = getFuelPriceStaleAfterHours();
  return {
    isStale: hours > threshold,
    staleHours: Math.max(0, Math.round(hours * 10) / 10),
  };
}

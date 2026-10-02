import { computeStale } from "../fuel-price/config.js";
import {
  findLatestFuelPriceSnapshot,
  getFuelPriceForDate,
} from "../fuel-price/sync-service.js";
import type { FuelPriceStatus } from "../../../shared/ride/pricing-v2/pricing.types.js";

export type FuelPriceLookupResult = {
  pricePerLiter: number | null;
  fuelType: string;
  source: "PETROLIMEX" | "PVOIL" | "NONE";
  sourceDate: string | null;
  status: FuelPriceStatus;
  isStale?: boolean;
  staleHours?: number;
  isFallback?: boolean;
  fallbackReason?: string;
};

/**
 * As-of fuel price for travelDate; fallback to latest snapshot with warning status.
 * Never crawls. Stale/fallback flags are informational only.
 */
export async function getFuelPriceForPricingV2(params: {
  fuelType: string;
  date: string;
}): Promise<FuelPriceLookupResult> {
  const fuelType = params.fuelType.trim();
  if (!fuelType) {
    return {
      pricePerLiter: null,
      fuelType: "",
      source: "NONE",
      sourceDate: null,
      status: "missing",
      isFallback: false,
    };
  }

  const asOf = await getFuelPriceForDate(fuelType, params.date);
  if (asOf) {
    const stale = computeStale(asOf.fuelPriceEffectiveAt);
    return {
      pricePerLiter: asOf.fuelPrice,
      fuelType: asOf.fuelType,
      source: asOf.fuelPriceSource,
      sourceDate: asOf.fuelPriceEffectiveAt,
      status: "ok",
      isStale: stale.isStale,
      staleHours: stale.staleHours,
      isFallback: false,
    };
  }

  const latest = await findLatestFuelPriceSnapshot();
  if (latest) {
    const product = latest.products.find(
      (p) => p.code.toUpperCase() === fuelType.toUpperCase(),
    );
    if (product && product.price > 0 && !product.unknown) {
      const stale = computeStale(latest.effectiveAt);
      return {
        pricePerLiter: product.price,
        fuelType: String(product.code),
        source: latest.source,
        sourceDate: latest.effectiveAt,
        status: "fallback_latest",
        isStale: stale.isStale,
        staleHours: stale.staleHours,
        isFallback: true,
        fallbackReason: "NO_AS_OF_SNAPSHOT",
      };
    }
  }

  return {
    pricePerLiter: null,
    fuelType,
    source: "NONE",
    sourceDate: null,
    status: "missing",
    isFallback: true,
    fallbackReason: "FUEL_PRICE_UNAVAILABLE",
  };
}

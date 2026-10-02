import {
  findLatestFuelPriceSnapshot,
  getFuelPriceForDate,
} from "../fuel-price/sync-service.js";
import type { FuelPriceStatus } from "../../../shared/ride/pricing-v2/pricing.types.js";

export type FuelPriceLookupResult = {
  pricePerLiter: number | null;
  fuelType: string;
  source: "PVOIL" | "NONE";
  sourceDate: string | null;
  status: FuelPriceStatus;
};

/**
 * As-of PVOIL price for travelDate; fallback to latest snapshot with warning status.
 * Never silently hard-codes a price.
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
    };
  }

  const asOf = await getFuelPriceForDate(fuelType, params.date);
  if (asOf) {
    return {
      pricePerLiter: asOf.fuelPrice,
      fuelType: asOf.fuelType,
      source: "PVOIL",
      sourceDate: asOf.fuelPriceEffectiveAt,
      status: "ok",
    };
  }

  const latest = await findLatestFuelPriceSnapshot();
  if (latest) {
    const product = latest.products.find(
      (p) => p.code.toUpperCase() === fuelType.toUpperCase(),
    );
    if (product && product.price > 0 && !product.unknown) {
      return {
        pricePerLiter: product.price,
        fuelType: String(product.code),
        source: "PVOIL",
        sourceDate: latest.effectiveAt,
        status: "fallback_latest",
      };
    }
  }

  return {
    pricePerLiter: null,
    fuelType,
    source: "NONE",
    sourceDate: null,
    status: "missing",
  };
}

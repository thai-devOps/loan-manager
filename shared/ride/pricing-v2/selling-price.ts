import type { PricingStrategy } from "../vehicle-pricing.js";
import type { PricingV2TripType } from "./pricing.types.js";
import {
  calculatePriceFromMargin,
  roundSellingPrice,
} from "./pricing.utils.js";

export function resolveStrategy(
  tripType: PricingV2TripType,
  configured?: PricingStrategy | null,
): PricingStrategy {
  if (configured === "PER_KM" || configured === "DAILY" || configured === "COST_PLUS") {
    return configured;
  }
  if (tripType === "DAILY_RENTAL") return "DAILY";
  return "PER_KM";
}

export function calculateBasePrice(params: {
  strategy: PricingStrategy;
  pricingDistanceKm: number;
  startupFee: number;
  pricePerKm: number;
  dailyRate: number;
  dailyIncludedKm: number;
  extraKmRate: number;
}): { basePrice: number; extraKm: number; extraKmCost: number } {
  if (params.strategy === "DAILY") {
    const extraKm = Math.max(
      0,
      params.pricingDistanceKm - Math.max(0, params.dailyIncludedKm),
    );
    const extraKmCost = extraKm * Math.max(0, params.extraKmRate);
    return {
      basePrice: Math.max(0, params.dailyRate) + extraKmCost,
      extraKm,
      extraKmCost,
    };
  }
  if (params.strategy === "COST_PLUS") {
    return { basePrice: 0, extraKm: 0, extraKmCost: 0 };
  }
  // PER_KM
  return {
    basePrice:
      Math.max(0, params.startupFee) +
      Math.max(0, params.pricingDistanceKm) * Math.max(0, params.pricePerKm),
    extraKm: 0,
    extraKmCost: 0,
  };
}

export function calculateSellingPriceV2(params: {
  strategy: PricingStrategy;
  totalCost: number;
  targetMargin: number;
  minimumTripPrice: number;
  basePrice: number;
  priceRoundingUnit: number;
}): {
  costPlusPrice: number;
  recommendedPriceBeforeRound: number;
  recommendedPrice: number;
  finalPrice: number;
} {
  const costPlusPrice = calculatePriceFromMargin(
    params.totalCost,
    params.targetMargin,
  );
  const recommendedPriceBeforeRound = Math.max(
    params.basePrice,
    costPlusPrice,
    Math.max(0, params.minimumTripPrice),
  );
  const recommendedPrice = roundSellingPrice(
    recommendedPriceBeforeRound,
    params.priceRoundingUnit,
  );
  return {
    costPlusPrice,
    recommendedPriceBeforeRound,
    recommendedPrice,
    finalPrice: recommendedPrice,
  };
}

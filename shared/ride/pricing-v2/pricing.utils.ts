import { DEFAULT_PRICE_ROUNDING_UNIT } from "./pricing.constants.js";

/**
 * True margin: price = cost / (1 - margin).
 * Example: cost 1_000_000, margin 0.30 → 1_428_571.428…
 */
export function calculatePriceFromMargin(
  cost: number,
  margin: number,
): number {
  if (!(cost >= 0) || !Number.isFinite(cost)) {
    throw new Error("DISTANCE_INVALID");
  }
  if (!(margin >= 0) || !(margin < 1) || !Number.isFinite(margin)) {
    throw new Error("INVALID_TARGET_MARGIN");
  }
  if (margin === 0) return cost;
  return cost / (1 - margin);
}

/** Round selling price UP to unit (default 10_000). Does not round cost. */
export function roundSellingPrice(
  amount: number,
  unit: number = DEFAULT_PRICE_ROUNDING_UNIT,
): number {
  if (!(amount >= 0) || !Number.isFinite(amount)) return 0;
  const u = Number(unit);
  if (!(u > 0) || !Number.isFinite(u)) {
    return Math.ceil(amount);
  }
  return Math.ceil(amount / u) * u;
}

export function computeMargin(profit: number, finalPrice: number): number {
  if (!(finalPrice > 0) || !Number.isFinite(finalPrice)) return 0;
  return profit / finalPrice;
}

export function resolvePricingDistanceKm(params: {
  tripType: "ONE_WAY" | "ROUND_TRIP" | "DAILY_RENTAL";
  oneWayDistanceKm: number;
  distanceAlreadyRoundTrip?: boolean;
}): { oneWayDistanceKm: number; pricingDistanceKm: number } {
  const oneWay = Math.max(0, Number(params.oneWayDistanceKm) || 0);
  if (params.tripType === "ROUND_TRIP") {
    if (params.distanceAlreadyRoundTrip) {
      return {
        oneWayDistanceKm: oneWay / 2,
        pricingDistanceKm: oneWay,
      };
    }
    return { oneWayDistanceKm: oneWay, pricingDistanceKm: oneWay * 2 };
  }
  return { oneWayDistanceKm: oneWay, pricingDistanceKm: oneWay };
}

export function resolvePricingDurationMinutes(params: {
  tripType: "ONE_WAY" | "ROUND_TRIP" | "DAILY_RENTAL";
  oneWayDurationMinutes: number;
  distanceAlreadyRoundTrip?: boolean;
}): { oneWayDurationMinutes: number; pricingDurationMinutes: number } {
  const oneWay = Math.max(0, Number(params.oneWayDurationMinutes) || 0);
  if (params.tripType === "ROUND_TRIP") {
    if (params.distanceAlreadyRoundTrip) {
      return {
        oneWayDurationMinutes: oneWay / 2,
        pricingDurationMinutes: oneWay,
      };
    }
    return {
      oneWayDurationMinutes: oneWay,
      pricingDurationMinutes: oneWay * 2,
    };
  }
  return {
    oneWayDurationMinutes: oneWay,
    pricingDurationMinutes: oneWay,
  };
}

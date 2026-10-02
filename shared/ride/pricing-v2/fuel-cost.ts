import {
  calculateFuelConsumption,
  calculateFuelCost,
  resolveOperationalDistanceKm,
} from "../fuel-estimate.js";

export function calculateFuelCostV2(params: {
  pricingDistanceKm: number;
  operationalDistanceFactor: number;
  consumptionLPer100Km: number | null;
  pricePerLiter: number | null;
}): {
  operationalDistanceKm: number;
  estimatedLiters: number;
  fuelCost: number;
} {
  const factor =
    Number(params.operationalDistanceFactor) >= 1
      ? Number(params.operationalDistanceFactor)
      : 1;
  const operationalDistanceKm = resolveOperationalDistanceKm(
    Math.max(0, params.pricingDistanceKm),
    factor,
  );

  if (
    params.consumptionLPer100Km == null ||
    !(params.consumptionLPer100Km > 0) ||
    params.pricePerLiter == null ||
    !(params.pricePerLiter > 0)
  ) {
    return {
      operationalDistanceKm,
      estimatedLiters: 0,
      fuelCost: 0,
    };
  }

  const estimatedLiters = calculateFuelConsumption(
    operationalDistanceKm,
    params.consumptionLPer100Km,
  );
  const price = Math.round(params.pricePerLiter);
  const fuelCost = calculateFuelCost(estimatedLiters, price);
  return { operationalDistanceKm, estimatedLiters, fuelCost };
}

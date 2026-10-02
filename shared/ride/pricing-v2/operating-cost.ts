export function calculateOperatingCostV2(params: {
  pricingDistanceKm: number;
  operatingCostPerKm: number;
}): { operatingCostPerKm: number; operatingCost: number } {
  const rate = Math.max(0, Number(params.operatingCostPerKm) || 0);
  const km = Math.max(0, Number(params.pricingDistanceKm) || 0);
  return {
    operatingCostPerKm: rate,
    operatingCost: km * rate,
  };
}

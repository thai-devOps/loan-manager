export function calculateDepreciationCostV2(params: {
  pricingDistanceKm: number;
  depreciationPerKm: number;
}): { depreciationPerKm: number; depreciationCost: number } {
  const rate = Math.max(0, Number(params.depreciationPerKm) || 0);
  const km = Math.max(0, Number(params.pricingDistanceKm) || 0);
  return {
    depreciationPerKm: rate,
    depreciationCost: km * rate,
  };
}

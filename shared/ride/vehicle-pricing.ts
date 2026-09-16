export type VehiclePricingConfig = {
  fuelType?: string;
  fuelConsumptionPer100Km: number;
  fuelPricePerLiter: number;
  driverRate: number;
  baseFare: number;
  pricePerKm: number;
  dailyRate: number;
  includedKm: number;
  extraKmRate: number;
};

/** Sensible VN fleet defaults when a vehicle has no pricing block. */
export const DEFAULT_VEHICLE_PRICING: VehiclePricingConfig = {
  fuelConsumptionPer100Km: 8,
  fuelPricePerLiter: 23_000,
  driverRate: 150_000,
  baseFare: 200_000,
  pricePerKm: 12_000,
  dailyRate: 1_500_000,
  includedKm: 200,
  extraKmRate: 10_000,
};

export function resolveVehiclePricing(
  raw?: Partial<VehiclePricingConfig> | null,
  fuelFallback?: string,
): VehiclePricingConfig {
  const d = DEFAULT_VEHICLE_PRICING;
  return {
    fuelType: raw?.fuelType?.trim() || fuelFallback || undefined,
    fuelConsumptionPer100Km:
      Number(raw?.fuelConsumptionPer100Km) > 0
        ? Number(raw?.fuelConsumptionPer100Km)
        : d.fuelConsumptionPer100Km,
    fuelPricePerLiter:
      Number(raw?.fuelPricePerLiter) > 0
        ? Number(raw?.fuelPricePerLiter)
        : d.fuelPricePerLiter,
    driverRate:
      Number(raw?.driverRate) >= 0 ? Number(raw?.driverRate) : d.driverRate,
    baseFare: Number(raw?.baseFare) >= 0 ? Number(raw?.baseFare) : d.baseFare,
    pricePerKm:
      Number(raw?.pricePerKm) >= 0 ? Number(raw?.pricePerKm) : d.pricePerKm,
    dailyRate:
      Number(raw?.dailyRate) >= 0 ? Number(raw?.dailyRate) : d.dailyRate,
    includedKm:
      Number(raw?.includedKm) >= 0 ? Number(raw?.includedKm) : d.includedKm,
    extraKmRate:
      Number(raw?.extraKmRate) >= 0 ? Number(raw?.extraKmRate) : d.extraKmRate,
  };
}

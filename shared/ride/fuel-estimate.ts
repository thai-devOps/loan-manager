import type {
  FuelConsumptionRates,
  RouteCondition,
  VehicleFuelType,
} from "./vehicle-pricing.js";

export type TripFuelEstimateInput = {
  vehicleId: string;
  fuelType: VehicleFuelType | string;
  billableDistanceKm: number;
  operationalDistanceFactor: number;
  routeCondition?: RouteCondition | null;
  fuelConsumption: FuelConsumptionRates;
  defaultConsumption: number;
  fuelPrice: number;
  fuelPriceEffectiveAt: string;
};

export type TripFuelEstimate = {
  vehicleId: string;
  fuelType: string;
  fuelPrice: number;
  fuelPriceEffectiveAt: string;
  billableDistanceKm: number;
  operationalDistanceKm: number;
  operationalDistanceFactor: number;
  routeCondition: RouteCondition | "default";
  consumptionLPer100Km: number;
  estimatedLiters: number;
  estimatedFuelCost: number;
  source: "PVOIL";
};

export type BookingFuelSnapshot = TripFuelEstimate;

export function pickConsumption(
  rates: FuelConsumptionRates,
  defaultConsumption: number,
  routeCondition?: RouteCondition | null,
): { consumptionLPer100Km: number; routeCondition: RouteCondition | "default" } {
  if (routeCondition === "city") {
    return { consumptionLPer100Km: rates.city, routeCondition: "city" };
  }
  if (routeCondition === "highway") {
    return { consumptionLPer100Km: rates.highway, routeCondition: "highway" };
  }
  if (routeCondition === "mixed") {
    return { consumptionLPer100Km: rates.mixed, routeCondition: "mixed" };
  }
  return {
    consumptionLPer100Km: defaultConsumption,
    routeCondition: "default",
  };
}

/** Liters — do not round early. */
export function calculateFuelConsumption(
  operationalDistanceKm: number,
  consumptionLPer100Km: number,
): number {
  if (!(operationalDistanceKm >= 0) || !(consumptionLPer100Km > 0)) {
    throw new Error("DISTANCE_INVALID");
  }
  return (operationalDistanceKm * consumptionLPer100Km) / 100;
}

/** Integer VND. */
export function calculateFuelCost(
  estimatedLiters: number,
  fuelPrice: number,
): number {
  if (!(estimatedLiters >= 0) || !(fuelPrice > 0) || !Number.isInteger(fuelPrice)) {
    throw new Error("FUEL_CONSUMPTION_INVALID");
  }
  return Math.round(estimatedLiters * fuelPrice);
}

export function resolveOperationalDistanceKm(
  billableDistanceKm: number,
  factor: number,
): number {
  if (!(billableDistanceKm >= 0) || !Number.isFinite(billableDistanceKm)) {
    throw new Error("DISTANCE_INVALID");
  }
  const f = Number(factor);
  if (!Number.isFinite(f) || f < 1) {
    throw new Error("DISTANCE_INVALID");
  }
  return billableDistanceKm * f;
}

export function estimateTripFuelCost(
  input: TripFuelEstimateInput,
): TripFuelEstimate {
  const operationalDistanceKm = resolveOperationalDistanceKm(
    input.billableDistanceKm,
    input.operationalDistanceFactor,
  );
  const picked = pickConsumption(
    input.fuelConsumption,
    input.defaultConsumption,
    input.routeCondition,
  );
  if (!(picked.consumptionLPer100Km > 0)) {
    throw new Error("FUEL_CONSUMPTION_INVALID");
  }
  const estimatedLiters = calculateFuelConsumption(
    operationalDistanceKm,
    picked.consumptionLPer100Km,
  );
  const estimatedFuelCost = calculateFuelCost(
    estimatedLiters,
    input.fuelPrice,
  );

  return {
    vehicleId: input.vehicleId,
    fuelType: String(input.fuelType),
    fuelPrice: input.fuelPrice,
    fuelPriceEffectiveAt: input.fuelPriceEffectiveAt,
    billableDistanceKm: input.billableDistanceKm,
    operationalDistanceKm,
    operationalDistanceFactor: input.operationalDistanceFactor,
    routeCondition: picked.routeCondition,
    consumptionLPer100Km: picked.consumptionLPer100Km,
    estimatedLiters,
    estimatedFuelCost,
    source: "PVOIL",
  };
}

export function buildFuelSnapshot(
  estimate: TripFuelEstimate,
): BookingFuelSnapshot {
  return { ...estimate };
}

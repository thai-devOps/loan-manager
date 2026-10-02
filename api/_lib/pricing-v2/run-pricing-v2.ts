import { getOperationalDistanceFactor } from "../ride-settings.js";
import { RouteServiceError } from "../ride-route.js";
import { validateVehicleFuelPricingInput } from "../../../shared/ride/vehicle-fuel-validate.js";
import { calculatePricingV2 } from "../../../shared/ride/pricing-v2/PricingEngineV2.js";
import type {
  PricingV2EngineResult,
  PricingV2TripType,
  TollItem,
} from "../../../shared/ride/pricing-v2/pricing.types.js";
import type { RouteCondition } from "../../../shared/ride/vehicle-pricing.js";
import { getFuelPriceForPricingV2 } from "./FuelPriceService.js";
import { persistPricingCalculation } from "./persist-pricing-calculation.js";
import {
  resolveRouteForPricing,
  type PricingRoutePlace,
} from "./RouteService.js";
import { resolveTollCost } from "./TollCostService.js";
import {
  loadVehiclePricingConfig,
  VehiclePricingConfigNotFoundError,
} from "./VehiclePricingConfigService.js";

export type RunPricingV2Input = {
  vehicleId: string;
  origin?: PricingRoutePlace;
  destination?: PricingRoutePlace;
  distanceKm?: number;
  durationMinutes?: number;
  routeType?: RouteCondition | string | null;
  tripType: string;
  waitingHours?: number;
  tolls?: TollItem[];
  otherCosts?: number;
  travelDate: string;
  bookingId?: string | null;
  distanceAlreadyRoundTrip?: boolean;
  persist?: boolean;
};

function normalizeTripType(raw: string): PricingV2TripType {
  const t = raw.trim().toUpperCase();
  if (t === "ROUND_TRIP") return "ROUND_TRIP";
  if (t === "DAILY" || t === "DAILY_RENTAL") return "DAILY_RENTAL";
  if (t === "ONE_WAY") return "ONE_WAY";
  throw Object.assign(new Error("Hình thức chuyến không hợp lệ"), {
    code: "INVALID_TRIP_TYPE",
    status: 422,
  });
}

function normalizeRouteType(
  raw?: string | null,
): RouteCondition | undefined {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "city" || t === "highway" || t === "mixed") return t;
  return undefined;
}

export async function runPricingV2(input: RunPricingV2Input): Promise<{
  result: PricingV2EngineResult;
  calculationId?: string;
  routeSource: "ORS" | "INPUT";
  provider: string;
}> {
  const vehicleId = (input.vehicleId ?? "").trim();
  if (!vehicleId) {
    throw Object.assign(new Error("Vui lòng chọn xe"), {
      code: "VEHICLE_PRICING_CONFIG_NOT_FOUND",
      status: 404,
    });
  }

  const tripType = normalizeTripType(input.tripType);
  const routeType = normalizeRouteType(
    typeof input.routeType === "string" ? input.routeType : null,
  );

  let loaded;
  try {
    loaded = await loadVehiclePricingConfig({ vehicleId, routeType });
  } catch (e) {
    if (e instanceof VehiclePricingConfigNotFoundError) {
      throw Object.assign(e, { status: 404 });
    }
    throw e;
  }

  const cfgCheck = validateVehicleFuelPricingInput(loaded.pricing);
  if (!cfgCheck.ok) {
    throw Object.assign(new Error(cfgCheck.error), {
      code: "INVALID_PRICING_CONFIG",
      status: 422,
    });
  }

  let route;
  try {
    route = await resolveRouteForPricing({
      origin: input.origin,
      destination: input.destination,
      distanceKm: input.distanceKm,
      durationMinutes: input.durationMinutes,
      routeType,
    });
  } catch (e) {
    if (e instanceof RouteServiceError) {
      throw Object.assign(
        new Error(e.message || "Không thể tính lộ trình"),
        {
          code: "ROUTE_CALCULATION_FAILED",
          status: e.code === "NO_ROUTE" ? 422 : 502,
        },
      );
    }
    throw Object.assign(new Error("Không thể tính lộ trình"), {
      code: "ROUTE_CALCULATION_FAILED",
      status: 502,
    });
  }

  const travelDate =
    (input.travelDate ?? "").trim() || new Date().toISOString();
  const fuelPrice = await getFuelPriceForPricingV2({
    fuelType: loaded.fuel.fuelType || "E10_RON95_III",
    date: travelDate,
  });

  const factor = await getOperationalDistanceFactor();
  const toll = resolveTollCost({ manuallyAddedTolls: input.tolls });

  const result = calculatePricingV2({
    vehicleId,
    tripType,
    oneWayDistanceKm: route.distanceKm,
    oneWayDurationMinutes: route.durationMinutes,
    distanceAlreadyRoundTrip: input.distanceAlreadyRoundTrip,
    routeType: route.routeType,
    waitingHours: input.waitingHours,
    tolls: toll.items,
    otherCosts: input.otherCosts,
    operationalDistanceFactor: factor,
    vehiclePricing: loaded.pricing,
    fuel: {
      fuelType: fuelPrice.fuelType || loaded.fuel.fuelType,
      pricePerLiter: fuelPrice.pricePerLiter,
      priceSource: fuelPrice.source,
      priceDate: fuelPrice.sourceDate,
      status: fuelPrice.status,
      consumptionLPer100Km: loaded.fuel.consumptionLPer100Km,
      consumptionSource: loaded.fuel.consumptionSource,
    },
    origin: {
      address: route.origin.address,
      latitude: route.origin.latitude,
      longitude: route.origin.longitude,
    },
    destination: {
      address: route.destination.address,
      latitude: route.destination.latitude,
      longitude: route.destination.longitude,
    },
    travelDate,
  });

  result.warnings = [
    ...loaded.fuel.warnings,
    ...result.warnings,
  ];
  result.route.source = route.source;

  let calculationId: string | undefined;
  if (input.persist !== false) {
    const doc = await persistPricingCalculation({
      vehicleId,
      bookingId: input.bookingId,
      result,
    });
    calculationId = doc.id;
  }

  return {
    result,
    calculationId,
    routeSource: route.source,
    provider: route.provider,
  };
}

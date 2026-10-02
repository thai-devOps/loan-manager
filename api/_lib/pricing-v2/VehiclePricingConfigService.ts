import { rideVehiclesCol, stripDoc } from "../mongo.js";
import type { RideVehicle } from "../ride-types.js";
import {
  pickConsumption,
} from "../../../shared/ride/fuel-estimate.js";
import {
  requireVehicleFuelConfig,
  resolveVehiclePricing,
  VehicleFuelConfigError,
  type RouteCondition,
  type VehiclePricingConfig,
} from "../../../shared/ride/vehicle-pricing.js";

export class VehiclePricingConfigNotFoundError extends Error {
  readonly code = "VEHICLE_PRICING_CONFIG_NOT_FOUND";
  constructor(message = "Không tìm thấy cấu hình giá xe.") {
    super(message);
    this.name = "VehiclePricingConfigNotFoundError";
  }
}

export type LoadedVehiclePricing = {
  vehicle: RideVehicle;
  pricing: VehiclePricingConfig;
  fuel: {
    fuelType: string;
    consumptionLPer100Km: number | null;
    consumptionSource: "VEHICLE_CONFIG" | "MISSING";
    routeCondition: RouteCondition | "default";
    warnings: string[];
  };
};

export async function loadVehiclePricingConfig(params: {
  vehicleId: string;
  routeType?: RouteCondition | null;
}): Promise<LoadedVehiclePricing> {
  const col = await rideVehiclesCol();
  const row = await col.findOne({ id: params.vehicleId });
  if (!row) {
    throw new VehiclePricingConfigNotFoundError(
      "Không tìm thấy xe hoặc cấu hình giá.",
    );
  }
  const vehicle = stripDoc(row) as RideVehicle;
  const pricing = resolveVehiclePricing(vehicle.pricing);
  const warnings: string[] = [];

  try {
    const fuelCfg = requireVehicleFuelConfig(pricing);
    const picked = pickConsumption(
      fuelCfg.fuelConsumption,
      fuelCfg.defaultConsumption,
      params.routeType,
    );
    return {
      vehicle,
      pricing,
      fuel: {
        fuelType: fuelCfg.fuelType,
        consumptionLPer100Km: picked.consumptionLPer100Km,
        consumptionSource: "VEHICLE_CONFIG",
        routeCondition: picked.routeCondition,
        warnings,
      },
    };
  } catch (e) {
    if (e instanceof VehicleFuelConfigError) {
      warnings.push(e.message);
      return {
        vehicle,
        pricing,
        fuel: {
          fuelType: String(pricing.fuelType ?? ""),
          consumptionLPer100Km: null,
          consumptionSource: "MISSING",
          routeCondition: "default",
          warnings,
        },
      };
    }
    throw e;
  }
}

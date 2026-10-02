import { getOperationalDistanceFactor } from "../ride-settings.js";
import { rideVehiclesCol, stripDoc } from "../mongo.js";
import type { RideVehicle } from "../ride-types.js";
import {
  estimateTripFuelCost,
  type TripFuelEstimate,
} from "../../../shared/ride/fuel-estimate.js";
import {
  requireVehicleFuelConfig,
  VehicleFuelConfigError,
  type RouteCondition,
} from "../../../shared/ride/vehicle-pricing.js";
import { FuelPriceError } from "./errors.js";
import { getFuelPriceForDate } from "./sync-service.js";

export type EstimateTripFuelInput = {
  vehicleId: string;
  billableDistanceKm: number;
  departureAt: string;
  routeCondition?: RouteCondition | null;
  operationalDistanceFactor?: number;
};

export async function estimateTripFuelCostForVehicle(
  input: EstimateTripFuelInput,
): Promise<TripFuelEstimate> {
  if (
    !(input.billableDistanceKm >= 0) ||
    !Number.isFinite(input.billableDistanceKm)
  ) {
    throw new FuelPriceError(
      "PVOIL_VALIDATION_FAILED",
      "DISTANCE_INVALID",
    );
  }

  const col = await rideVehiclesCol();
  const row = await col.findOne({ id: input.vehicleId });
  if (!row) {
    const err = new Error("VEHICLE_NOT_FOUND");
    err.name = "VehicleNotFoundError";
    throw err;
  }
  const vehicle = stripDoc(row) as RideVehicle;
  const fuelConfig = requireVehicleFuelConfig(vehicle.pricing);

  const factor =
    input.operationalDistanceFactor != null &&
    Number.isFinite(input.operationalDistanceFactor) &&
    input.operationalDistanceFactor >= 1
      ? input.operationalDistanceFactor
      : await getOperationalDistanceFactor();

  const price = await getFuelPriceForDate(
    fuelConfig.fuelType,
    input.departureAt,
  );
  if (!price) {
    throw new FuelPriceError(
      "PVOIL_VALIDATION_FAILED",
      "FUEL_PRICE_NOT_FOUND",
    );
  }

  return estimateTripFuelCost({
    vehicleId: vehicle.id,
    fuelType: fuelConfig.fuelType,
    billableDistanceKm: input.billableDistanceKm,
    operationalDistanceFactor: factor,
    routeCondition: input.routeCondition,
    fuelConsumption: fuelConfig.fuelConsumption,
    defaultConsumption: fuelConfig.defaultConsumption,
    fuelPrice: price.fuelPrice,
    fuelPriceEffectiveAt: price.fuelPriceEffectiveAt,
  });
}

/** Map estimate errors to API { code, message } for quote handlers. */
export function fuelEstimateErrorToClient(e: unknown): {
  code: string;
  message: string;
  status: number;
} {
  if (e instanceof Error && e.name === "VehicleNotFoundError") {
    return {
      code: "VEHICLE_NOT_FOUND",
      message: "Không tìm thấy xe.",
      status: 404,
    };
  }
  if (e instanceof VehicleFuelConfigError) {
    return {
      code: e.code,
      message: e.message,
      status: 422,
    };
  }
  if (e instanceof FuelPriceError) {
    if (e.message.includes("FUEL_PRICE_NOT_FOUND") || e.message.includes("DISTANCE_INVALID")) {
      const code = e.message.includes("DISTANCE_INVALID")
        ? "DISTANCE_INVALID"
        : "FUEL_PRICE_NOT_FOUND";
      return {
        code,
        message:
          code === "FUEL_PRICE_NOT_FOUND"
            ? "Chưa có giá nhiên liệu PVOIL cho ngày chuyến. Vui lòng đồng bộ giá xăng dầu."
            : "Quãng đường không hợp lệ.",
        status: 422,
      };
    }
    return {
      code: e.code,
      message: e.toClientMessage(),
      status: 503,
    };
  }
  if (e instanceof Error && e.message === "DISTANCE_INVALID") {
    return {
      code: "DISTANCE_INVALID",
      message: "Quãng đường không hợp lệ.",
      status: 422,
    };
  }
  if (e instanceof Error && e.message === "FUEL_CONSUMPTION_INVALID") {
    return {
      code: "FUEL_CONSUMPTION_INVALID",
      message: "Mức tiêu hao nhiên liệu không hợp lệ.",
      status: 422,
    };
  }
  return {
    code: "QUOTATION_CALCULATION_FAILED",
    message: "Không tính được báo giá lúc này.",
    status: 500,
  };
}

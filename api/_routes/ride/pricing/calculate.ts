import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  normalizeLocationKey,
  runPricingCalculate,
  seatsToVehicleCategory,
} from "../../../_lib/ride-pricing.js";
import type {
  PricingServiceMatch,
  VehicleCategory,
} from "../../../_lib/ride-types.js";
import { rideVehiclesCol } from "../../../_lib/mongo.js";

type Body = {
  serviceType?: PricingServiceMatch;
  vehicleCategory?: VehicleCategory;
  vehicleId?: string;
  seats?: number;
  origin?: string;
  destination?: string;
  originKey?: string;
  destinationKey?: string;
  distanceKm?: number;
  roundTrip?: boolean;
  date?: string;
  overtimeHours?: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }

    const body = readJsonBody<Body>(req);

    let vehicleCategory = body.vehicleCategory;
    if (!vehicleCategory && body.vehicleId) {
      const vehicles = await rideVehiclesCol();
      const v = await vehicles.findOne({ id: body.vehicleId });
      if (v) vehicleCategory = seatsToVehicleCategory(v.seats);
    }
    if (!vehicleCategory && body.seats != null) {
      vehicleCategory = seatsToVehicleCategory(Number(body.seats));
    }
    if (!vehicleCategory) vehicleCategory = "ANY";

    const originKey =
      body.originKey ||
      (body.origin ? normalizeLocationKey(body.origin) : undefined);
    const destinationKey =
      body.destinationKey ||
      (body.destination ? normalizeLocationKey(body.destination) : undefined);

    const distanceKm = Number(body.distanceKm);
    if (!Number.isFinite(distanceKm) || distanceKm < 0) {
      res.status(400).json({ error: "Khoảng cách không hợp lệ" });
      return;
    }

    const date = (body.date || new Date().toISOString()).slice(0, 10);

    const result = await runPricingCalculate({
      serviceType: body.serviceType || "TRAVEL",
      vehicleCategory,
      originKey,
      destinationKey,
      distanceKm,
      roundTrip: body.roundTrip === true,
      date,
      overtimeHours: body.overtimeHours,
    });

    if (!result.ok) {
      res.status(400).json({
        error: result.message,
        code: result.code,
      });
      return;
    }

    // Customer breakdown only — never fuel/driver/operating costs
    res.status(200).json({
      matchedRuleId: result.matchedRuleId,
      matchedRuleName: result.matchedRuleName,
      version: result.version,
      billableKm: result.billableKm,
      breakdown: result.breakdown,
      snapshot: result.snapshot,
      origin: body.origin,
      destination: body.destination,
      roundTrip: body.roundTrip === true,
      date,
      vehicleCategory,
    });
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, readJsonBody, withHandler } from "../../_lib/http.js";
import {
  expandVietnamPlaceQuery,
  searchAddress,
  type GeocodeResult,
} from "../../_lib/ride-geocode.js";
import {
  haversineKm,
  RouteServiceError,
  routeService,
  type RoutePlace,
  type RouteResult,
} from "../../_lib/ride-route.js";
import { calculateTripQuote } from "../../../shared/ride/quote-engine.js";
import { resolveVehiclePricing } from "../../../shared/ride/vehicle-pricing.js";
import type { TripType } from "../../_lib/ride-types.js";
import { rideVehiclesCol, stripDoc } from "../../_lib/mongo.js";

const TRIP_TYPES = new Set(["ONE_WAY", "ROUND_TRIP", "DAILY", "CUSTOM"]);

type PlaceBody = {
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

/** Coerce place coords; treat null/undefined/NaN as missing (NOT 0 — Number(null)===0). */
function parseCoord(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function hasUsableCoords(lat: number | null, lng: number | null): boolean {
  if (lat == null || lng == null) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

async function geocodeBest(address: string): Promise<GeocodeResult | null> {
  const hits = await searchAddress(expandVietnamPlaceQuery(address), {
    limit: 5,
  });
  return hits[0] ?? null;
}

/**
 * Resolve a place from coords or address. When both ends only have addresses,
 * pick geocode candidates that are farthest apart (avoids both snapping to
 * the same Ambiguous "Châu Thành" / province center).
 */
async function resolvePlacePair(
  pickup: PlaceBody | undefined,
  destination: PlaceBody | undefined,
): Promise<{ origin: RoutePlace; destination: RoutePlace } | null> {
  if (!pickup || !destination) return null;

  const pLat = parseCoord(pickup.latitude);
  const pLng = parseCoord(pickup.longitude);
  const dLat = parseCoord(destination.latitude);
  const dLng = parseCoord(destination.longitude);

  const pickupHas = hasUsableCoords(pLat, pLng);
  const destHas = hasUsableCoords(dLat, dLng);

  if (pickupHas && destHas) {
    const origin: RoutePlace = {
      address: (pickup.address ?? "").trim() || undefined,
      latitude: pLat as number,
      longitude: pLng as number,
    };
    const dest: RoutePlace = {
      address: (destination.address ?? "").trim() || undefined,
      latitude: dLat as number,
      longitude: dLng as number,
    };
    // Stored coords that collapse to ~same point are useless — geocode instead
    if (haversineKm(origin, dest) >= 0.2) {
      return { origin, destination: dest };
    }
  }

  const pickupAddr = (pickup.address ?? "").trim();
  const destAddr = (destination.address ?? "").trim();
  if (pickupAddr.length < 2 || destAddr.length < 2) return null;

  const [pickupHits, destHits] = await Promise.all([
    pickupHas
      ? Promise.resolve([
          {
            label: pickupAddr,
            latitude: pLat as number,
            longitude: pLng as number,
          },
        ] as GeocodeResult[])
      : searchAddress(expandVietnamPlaceQuery(pickupAddr), { limit: 5 }),
    destHas
      ? Promise.resolve([
          {
            label: destAddr,
            latitude: dLat as number,
            longitude: dLng as number,
          },
        ] as GeocodeResult[])
      : searchAddress(expandVietnamPlaceQuery(destAddr), { limit: 5 }),
  ]);

  if (pickupHits.length === 0 || destHits.length === 0) return null;

  let best: { origin: RoutePlace; destination: RoutePlace; dist: number } | null =
    null;
  for (const o of pickupHits) {
    for (const d of destHits) {
      const dist = haversineKm(
        { latitude: o.latitude, longitude: o.longitude },
        { latitude: d.latitude, longitude: d.longitude },
      );
      if (!best || dist > best.dist) {
        best = {
          dist,
          origin: {
            address: o.label,
            latitude: o.latitude,
            longitude: o.longitude,
          },
          destination: {
            address: d.label,
            latitude: d.latitude,
            longitude: d.longitude,
          },
        };
      }
    }
  }

  if (!best || best.dist < 0.2) return null;
  return { origin: best.origin, destination: best.destination };
}

async function routeWithRepair(
  origin: RoutePlace,
  destination: RoutePlace,
  pickupAddr: string,
  destAddr: string,
): Promise<{ route: RouteResult; origin: RoutePlace; destination: RoutePlace }> {
  try {
    const route = await routeService.calculateRoute({ origin, destination });
    if (route.distanceKm >= 0.2) {
      return { route, origin, destination };
    }
  } catch (e) {
    if (!(e instanceof RouteServiceError) || e.code === "MISSING_KEY") {
      // continue to repair below for NO_ROUTE/UPSTREAM; rethrow MISSING only if no repair
      if (e instanceof RouteServiceError && e.code === "MISSING_KEY") throw e;
    }
  }

  // Re-geocode with expanded queries and pick farthest pair
  const repaired = await resolvePlacePair(
    { address: pickupAddr || origin.address },
    { address: destAddr || destination.address },
  );
  if (!repaired) {
    throw new RouteServiceError(
      "NO_ROUTE",
      "Không thể xác định tuyến đường. Vui lòng kiểm tra lại địa chỉ.",
    );
  }
  const route = await routeService.calculateRoute(repaired);
  return {
    route,
    origin: repaired.origin,
    destination: repaired.destination,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }

    const body = readJsonBody<{
      tripType?: string;
      vehicleId?: string;
      pickup?: PlaceBody;
      destination?: PlaceBody;
      tollFee?: number;
      parkingFee?: number;
      waitingFee?: number;
      serviceType?: string;
      date?: string;
    }>(req);

    const tripType = (body.tripType ?? "").trim() as TripType;
    const vehicleId = (body.vehicleId ?? "").trim();
    if (!TRIP_TYPES.has(tripType)) {
      res.status(400).json({ error: "Hình thức chuyến không hợp lệ" });
      return;
    }
    if (!vehicleId) {
      res.status(400).json({ error: "Vui lòng chọn xe" });
      return;
    }

    const vehicles = await rideVehiclesCol();
    const vehicle = await vehicles.findOne({ id: vehicleId, active: true });
    if (!vehicle) {
      res.status(400).json({ error: "Xe không còn khả dụng" });
      return;
    }

    const pricing = resolveVehiclePricing(vehicle.pricing, vehicle.fuel);

    if (tripType === "CUSTOM") {
      const engine = calculateTripQuote({
        tripType: "CUSTOM",
        distanceKm: 0,
        durationMinutes: 0,
        pricingConfig: pricing,
        tollFee: body.tollFee,
        parkingFee: body.parkingFee,
        waitingFee: body.waitingFee,
      });
      res.status(200).json({
        display: "Liên hệ báo giá",
        amount: null,
        autoQuote: false,
        totalPrice: null,
        breakdown: engine.breakdown,
        vehicle: stripDoc(vehicle),
        errorCode: "CUSTOM",
        errorMessage:
          "Chuyến tùy chỉnh — vui lòng gửi yêu cầu báo giá thủ công.",
      });
      return;
    }

    try {
      const pair = await resolvePlacePair(body.pickup, body.destination);
      if (!pair) {
        // Last attempt: geocode each address individually
        const [o, d] = await Promise.all([
          geocodeBest(body.pickup?.address ?? ""),
          geocodeBest(body.destination?.address ?? ""),
        ]);
        if (!o || !d) {
          res.status(400).json({
            error:
              "Không thể xác định tuyến đường. Vui lòng kiểm tra lại địa chỉ.",
            code: "NO_ROUTE",
          });
          return;
        }
        const repaired = await routeWithRepair(
          {
            address: o.label,
            latitude: o.latitude,
            longitude: o.longitude,
          },
          {
            address: d.label,
            latitude: d.latitude,
            longitude: d.longitude,
          },
          body.pickup?.address ?? "",
          body.destination?.address ?? "",
        );
        return await respondQuote(
          res,
          tripType,
          pricing,
          vehicle,
          body,
          repaired.origin,
          repaired.destination,
          repaired.route,
        );
      }

      const repaired = await routeWithRepair(
        pair.origin,
        pair.destination,
        body.pickup?.address ?? "",
        body.destination?.address ?? "",
      );

      return await respondQuote(
        res,
        tripType,
        pricing,
        vehicle,
        body,
        repaired.origin,
        repaired.destination,
        repaired.route,
      );
    } catch (e) {
      if (e instanceof RouteServiceError) {
        const status =
          e.code === "MISSING_KEY" ? 503 : e.code === "NO_ROUTE" ? 422 : 502;
        res.status(status).json({
          error: e.message,
          code: e.code,
          display: "Liên hệ báo giá",
          amount: null,
          autoQuote: false,
        });
        return;
      }
      throw e;
    }
  });
}

async function respondQuote(
  res: VercelResponse,
  tripType: TripType,
  pricing: ReturnType<typeof resolveVehiclePricing>,
  vehicle: { id: string; seats?: number; name?: string; [key: string]: unknown },
  body: {
    tollFee?: number;
    parkingFee?: number;
    waitingFee?: number;
    pickup?: PlaceBody;
    destination?: PlaceBody;
    serviceType?: string;
    date?: string;
  },
  origin: RoutePlace,
  destination: RoutePlace,
  route: RouteResult,
) {
  // Auto-quote from routed distance + vehicle pricing config (base + /km + fuel/driver).
  const engine = calculateTripQuote({
    tripType,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    pricingConfig: pricing,
    tollFee: body.tollFee,
    parkingFee: body.parkingFee,
    waitingFee: body.waitingFee,
  });

  const quotedAt = new Date().toISOString();
  const snapshot = {
    distanceKm: engine.distanceKm,
    durationMinutes: engine.durationMinutes,
    fuelPricePerLiter: pricing.fuelPricePerLiter,
    fuelConsumptionPer100Km: pricing.fuelConsumptionPer100Km,
    fuelLiters: engine.fuelLiters,
    fuelCost: engine.fuelCost,
    driverFee: engine.driverCost,
    tollFee: engine.tollFee,
    parkingFee: engine.parkingFee,
    waitingFee: engine.waitingFee,
    additionalFee: engine.additionalFee,
    operatingCost: engine.operatingCost,
    subtotal: engine.subtotal,
    totalPrice: engine.totalPrice ?? 0,
    breakdown: engine.breakdown,
    provider: route.provider,
    quotedAt,
  };

  const pricingSnapshot =
    engine.totalPrice != null && engine.autoQuote
      ? {
          pricingRuleId: `vehicle:${String(vehicle.id)}`,
          version: 1,
          calculatedAt: quotedAt,
          basePrice: pricing.baseFare,
          distanceKm: engine.billableKm,
          distancePrice: Math.max(
            0,
            engine.fare - (Number(pricing.baseFare) || 0),
          ),
          surcharges: engine.operatingCost + engine.additionalFee,
          total: engine.totalPrice,
          originKey: origin.address ?? body.pickup?.address ?? "",
          destinationKey: destination.address ?? body.destination?.address ?? "",
          roundTrip: tripType === "ROUND_TRIP",
        }
      : null;

  res.status(200).json({
    display:
      engine.totalPrice != null
        ? `${engine.totalPrice.toLocaleString("vi-VN")} đ`
        : "Liên hệ báo giá",
    amount: engine.totalPrice,
    autoQuote: engine.autoQuote,
    distanceKm: engine.distanceKm,
    durationMinutes: engine.durationMinutes,
    fuelLiters: engine.fuelLiters,
    fuelCost: engine.fuelCost,
    driverCost: engine.driverCost,
    tollFee: engine.tollFee,
    parkingFee: engine.parkingFee,
    waitingFee: engine.waitingFee,
    additionalFee: engine.additionalFee,
    operatingCost: engine.operatingCost,
    subtotal: engine.subtotal,
    totalPrice: engine.totalPrice,
    breakdown: engine.breakdown,
    provider: route.provider,
    snapshot,
    pricingSnapshot,
    resolvedPickup: {
      address: origin.address ?? body.pickup?.address ?? "",
      latitude: origin.latitude,
      longitude: origin.longitude,
    },
    resolvedDestination: {
      address: destination.address ?? body.destination?.address ?? "",
      latitude: destination.latitude,
      longitude: destination.longitude,
    },
    vehicle: stripDoc(vehicle as { _id?: unknown }),
  });
}

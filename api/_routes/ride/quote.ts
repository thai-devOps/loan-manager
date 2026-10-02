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
import type { RouteCondition } from "../../../shared/ride/vehicle-pricing.js";
import type { TripType } from "../../_lib/ride-types.js";
import { rideVehiclesCol, stripDoc, usersCol } from "../../_lib/mongo.js";
import { verifyToken } from "../../_lib/auth.js";
import {
  getEffectivePermissions,
  hasAnyPermission,
} from "../../_lib/access/permissions-resolve.js";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import {
  estimateTripFuelCostForVehicle,
  fuelEstimateErrorToClient,
} from "../../_lib/fuel-price/estimate-trip.js";
import { buildFuelSnapshot } from "../../../shared/ride/fuel-estimate.js";

const TRIP_TYPES = new Set(["ONE_WAY", "ROUND_TRIP", "DAILY", "CUSTOM"]);
const ROUTE_CONDITIONS = new Set(["city", "highway", "mixed"]);

type PlaceBody = {
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

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
): Promise<{
  route: RouteResult;
  origin: RoutePlace;
  destination: RoutePlace;
}> {
  const first = await routeService.calculateRoute({ origin, destination });
  if (first.distanceKm >= 0.2) {
    return { route: first, origin, destination };
  }

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

function resolveDepartureAt(date?: string, time?: string): string {
  const d = (date ?? "").trim();
  const t = (time ?? "").trim();
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const hhmm = t && /^\d{1,2}:\d{2}/.test(t) ? t.slice(0, 5) : "15:00";
    const [h, m] = hhmm.split(":").map(Number);
    const iso = `${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+07:00`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

async function canSeeInternalBreakdown(req: VercelRequest): Promise<boolean> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  const session = await verifyToken(token);
  if (!session) return false;
  const col = await usersCol();
  const user = await col.findOne({ id: session.userId });
  if (!user || user.status !== "ACTIVE") return false;
  const { roleCodes, permissions } = await getEffectivePermissions(user);
  return hasAnyPermission(permissions, roleCodes, [
    PERMISSIONS.FLEET_BOOKING_VIEW,
    PERMISSIONS.FLEET_PRICING_VIEW,
  ]);
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
      time?: string;
      departureAt?: string;
      routeCondition?: string;
      // Ignored — never trust client fuel/cost inputs
      fuelPrice?: unknown;
      fuelCost?: unknown;
      fuelConsumption?: unknown;
      markup?: unknown;
      totalCost?: unknown;
    }>(req);

    void body.fuelPrice;
    void body.fuelCost;
    void body.fuelConsumption;
    void body.markup;
    void body.totalCost;

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

    const routeConditionRaw = (body.routeCondition ?? "").trim();
    const routeCondition = ROUTE_CONDITIONS.has(routeConditionRaw)
      ? (routeConditionRaw as RouteCondition)
      : undefined;

    const vehicles = await rideVehiclesCol();
    const vehicle = await vehicles.findOne({ id: vehicleId, active: true });
    if (!vehicle) {
      res.status(404).json({
        error: "Không tìm thấy xe.",
        code: "VEHICLE_NOT_FOUND",
      });
      return;
    }

    const pricing = resolveVehiclePricing(vehicle.pricing);

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
        vehicle: stripDoc(vehicle),
        errorCode: "CUSTOM",
        errorMessage:
          "Chuyến tùy chỉnh — vui lòng gửi yêu cầu báo giá thủ công.",
      });
      void engine;
      return;
    }

    try {
      const pair = await resolvePlacePair(body.pickup, body.destination);
      if (!pair) {
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
          req,
          res,
          tripType,
          pricing,
          vehicle,
          body,
          repaired.origin,
          repaired.destination,
          repaired.route,
          routeCondition,
        );
      }

      const repaired = await routeWithRepair(
        pair.origin,
        pair.destination,
        body.pickup?.address ?? "",
        body.destination?.address ?? "",
      );

      return await respondQuote(
        req,
        res,
        tripType,
        pricing,
        vehicle,
        body,
        repaired.origin,
        repaired.destination,
        repaired.route,
        routeCondition,
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
  req: VercelRequest,
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
    time?: string;
    departureAt?: string;
  },
  origin: RoutePlace,
  destination: RoutePlace,
  route: RouteResult,
  routeCondition?: RouteCondition,
) {
  const oneWayKm = route.distanceKm;
  const isRound = tripType === "ROUND_TRIP";
  const billableKm = isRound ? oneWayKm * 2 : oneWayKm;
  const departureAt =
    typeof body.departureAt === "string" && body.departureAt.trim()
      ? new Date(body.departureAt).toISOString()
      : resolveDepartureAt(body.date, body.time);

  let fuelEstimate;
  try {
    fuelEstimate = await estimateTripFuelCostForVehicle({
      vehicleId: String(vehicle.id),
      billableDistanceKm: billableKm,
      departureAt,
      routeCondition,
    });
  } catch (e) {
    const client = fuelEstimateErrorToClient(e);
    if (client.code === "VEHICLE_FUEL_CONFIG_MISSING") {
      client.code = "VEHICLE_FUEL_CONFIG_MISSING";
    }
    res.status(client.status).json({
      error: client.message,
      code: client.code === "VEHICLE_FUEL_CONFIG_MISSING" &&
        client.message.includes("Không tìm thấy xe")
        ? "VEHICLE_NOT_FOUND"
        : client.code,
      display: "Liên hệ báo giá",
      amount: null,
      autoQuote: false,
    });
    return;
  }

  const engine = calculateTripQuote({
    tripType,
    distanceKm: oneWayKm,
    durationMinutes: route.durationMinutes,
    pricingConfig: pricing,
    tollFee: body.tollFee,
    parkingFee: body.parkingFee,
    waitingFee: body.waitingFee,
    fuelOverride: {
      estimatedLiters: fuelEstimate.estimatedLiters,
      fuelCost: fuelEstimate.estimatedFuelCost,
      fuelPricePerLiter: fuelEstimate.fuelPrice,
      consumptionLPer100Km: fuelEstimate.consumptionLPer100Km,
      billableDistanceKm: fuelEstimate.billableDistanceKm,
      operationalDistanceKm: fuelEstimate.operationalDistanceKm,
      operationalDistanceFactor: fuelEstimate.operationalDistanceFactor,
    },
  });

  const quotedAt = new Date().toISOString();
  const fuelSnapshot = buildFuelSnapshot(fuelEstimate);
  const snapshot = {
    distanceKm: engine.distanceKm,
    durationMinutes: engine.durationMinutes,
    billableDistanceKm: engine.billableKm,
    operationalDistanceKm: engine.operationalDistanceKm,
    operationalDistanceFactor: engine.operationalDistanceFactor,
    fuelPricePerLiter: engine.fuelPricePerLiter,
    fuelConsumptionPer100Km: engine.fuelConsumptionPer100Km,
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
    fuelSnapshot,
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

  const internal = await canSeeInternalBreakdown(req);
  const totalCost =
    engine.fuelCost +
    engine.driverCost +
    engine.tollFee +
    engine.parkingFee +
    engine.waitingFee;
  const customerPrice = engine.totalPrice;
  const expectedProfit =
    customerPrice != null ? customerPrice - totalCost : null;

  /** Customer-safe snapshot: freeze fuel + price; omit internal cost lines. */
  const publicSnapshot = {
    distanceKm: snapshot.distanceKm,
    durationMinutes: snapshot.durationMinutes,
    billableDistanceKm: snapshot.billableDistanceKm,
    operationalDistanceKm: snapshot.operationalDistanceKm,
    operationalDistanceFactor: snapshot.operationalDistanceFactor,
    fuelPricePerLiter: snapshot.fuelPricePerLiter,
    fuelConsumptionPer100Km: snapshot.fuelConsumptionPer100Km,
    fuelLiters: snapshot.fuelLiters,
    fuelCost: snapshot.fuelCost,
    driverFee: 0,
    tollFee: snapshot.tollFee,
    parkingFee: snapshot.parkingFee,
    waitingFee: snapshot.waitingFee,
    additionalFee: snapshot.additionalFee,
    operatingCost: 0,
    subtotal: snapshot.totalPrice,
    totalPrice: snapshot.totalPrice,
    breakdown: [] as typeof snapshot.breakdown,
    provider: snapshot.provider,
    quotedAt: snapshot.quotedAt,
    fuelSnapshot: snapshot.fuelSnapshot,
  };

  const publicBody = {
    display:
      engine.totalPrice != null
        ? `${engine.totalPrice.toLocaleString("vi-VN")} đ`
        : "Liên hệ báo giá",
    amount: engine.totalPrice,
    autoQuote: engine.autoQuote,
    distanceKm: engine.distanceKm,
    billableDistanceKm: engine.billableKm,
    durationMinutes: engine.durationMinutes,
    fuel: {
      type: fuelEstimate.fuelType,
      consumption: fuelEstimate.consumptionLPer100Km,
      liters: fuelEstimate.estimatedLiters,
    },
    fuelLiters: engine.fuelLiters,
    totalPrice: engine.totalPrice,
    provider: route.provider,
    snapshot: publicSnapshot,
    pricingSnapshot: pricingSnapshot
      ? {
          pricingRuleId: pricingSnapshot.pricingRuleId,
          version: pricingSnapshot.version,
          calculatedAt: pricingSnapshot.calculatedAt,
          basePrice: pricingSnapshot.basePrice,
          distanceKm: pricingSnapshot.distanceKm,
          distancePrice: pricingSnapshot.distancePrice,
          surcharges: 0,
          total: pricingSnapshot.total,
          originKey: pricingSnapshot.originKey,
          destinationKey: pricingSnapshot.destinationKey,
          roundTrip: pricingSnapshot.roundTrip,
        }
      : null,
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
    vehicle: {
      id: String(vehicle.id),
      name: vehicle.name ?? undefined,
      seats: vehicle.seats ?? undefined,
    },
  };

  if (internal) {
    res.status(200).json({
      ...publicBody,
      operationalDistanceKm: engine.operationalDistanceKm,
      fuel: {
        type: fuelEstimate.fuelType,
        price: fuelEstimate.fuelPrice,
        priceEffectiveAt: fuelEstimate.fuelPriceEffectiveAt,
        consumption: fuelEstimate.consumptionLPer100Km,
        liters: fuelEstimate.estimatedLiters,
        cost: fuelEstimate.estimatedFuelCost,
      },
      snapshot,
      pricingSnapshot,
      fuelCost: engine.fuelCost,
      driverCost: engine.driverCost,
      tollFee: engine.tollFee,
      parkingFee: engine.parkingFee,
      waitingFee: engine.waitingFee,
      additionalFee: engine.additionalFee,
      operatingCost: engine.operatingCost,
      subtotal: engine.subtotal,
      breakdown: engine.breakdown,
      pricing: {
        totalCost,
        customerPrice,
        expectedProfit,
        fare: engine.fare,
      },
      vehicle: stripDoc(vehicle as { _id?: unknown }),
    });
    return;
  }

  res.status(200).json(publicBody);
}

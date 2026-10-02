import {
  expandVietnamPlaceQuery,
  searchAddress,
  type GeocodeResult,
} from "../ride-geocode.js";
import {
  haversineKm,
  RouteServiceError,
  routeService,
  type RoutePlace,
  type RouteResult,
} from "../ride-route.js";
import type { RouteCondition } from "../../../shared/ride/vehicle-pricing.js";

export type PricingRoutePlace = {
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type PricingRouteResult = {
  distanceKm: number;
  durationMinutes: number;
  geometry?: unknown;
  routeType: RouteCondition;
  origin: RoutePlace;
  destination: RoutePlace;
  provider: RouteResult["provider"];
  source: "ORS" | "INPUT";
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

async function resolvePlacePair(
  pickup: PricingRoutePlace | undefined,
  destination: PricingRoutePlace | undefined,
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

export async function resolveRouteForPricing(params: {
  origin?: PricingRoutePlace;
  destination?: PricingRoutePlace;
  distanceKm?: number;
  durationMinutes?: number;
  routeType?: RouteCondition | null;
}): Promise<PricingRouteResult> {
  const routeType: RouteCondition =
    params.routeType === "city" ||
    params.routeType === "highway" ||
    params.routeType === "mixed"
      ? params.routeType
      : "mixed";

  const providedKm = Number(params.distanceKm);
  const providedMin = Number(params.durationMinutes);
  if (
    Number.isFinite(providedKm) &&
    providedKm >= 0.2 &&
    Number.isFinite(providedMin) &&
    providedMin >= 0
  ) {
    const pair = await resolvePlacePair(params.origin, params.destination);
    return {
      distanceKm: providedKm,
      durationMinutes: providedMin,
      routeType,
      origin: pair?.origin ?? {
        address: params.origin?.address,
        latitude: Number(params.origin?.latitude) || 0,
        longitude: Number(params.origin?.longitude) || 0,
      },
      destination: pair?.destination ?? {
        address: params.destination?.address,
        latitude: Number(params.destination?.latitude) || 0,
        longitude: Number(params.destination?.longitude) || 0,
      },
      provider: "haversine_estimate",
      source: "INPUT",
    };
  }

  const pair = await resolvePlacePair(params.origin, params.destination);
  if (!pair) {
    throw new RouteServiceError(
      "NO_ROUTE",
      "Không thể xác định tuyến đường. Vui lòng kiểm tra lại địa chỉ.",
    );
  }

  try {
    const route = await routeService.calculateRoute(pair);
    return {
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      routeType,
      origin: route.origin,
      destination: route.destination,
      provider: route.provider,
      source: "ORS",
    };
  } catch (e) {
    if (e instanceof RouteServiceError) throw e;
    throw new RouteServiceError(
      "UPSTREAM",
      "Không thể tính khoảng cách lúc này.",
    );
  }
}

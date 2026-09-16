import { isInsideVietnam } from "./ors-vietnam.js";

export type RoutePlace = {
  address?: string;
  latitude: number;
  longitude: number;
};

export type RouteResult = {
  distanceKm: number;
  durationMinutes: number;
  origin: RoutePlace;
  destination: RoutePlace;
  provider: "openrouteservice" | "haversine_estimate";
};

export type RouteErrorCode = "NO_ROUTE" | "TIMEOUT" | "UPSTREAM" | "MISSING_KEY";

export class RouteServiceError extends Error {
  code: RouteErrorCode;

  constructor(code: RouteErrorCode, message: string) {
    super(message);
    this.name = "RouteServiceError";
    this.code = code;
  }
}

function getOrsKey(): string {
  return (process.env.ORS_API_KEY ?? "").trim();
}
/** Great-circle distance in km. */
export function haversineKm(a: RoutePlace, b: RoutePlace): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rural VN road factor over straight-line distance. */
export function estimateRoadKm(straightKm: number): number {
  return Math.round(straightKm * 1.35 * 100) / 100;
}

export function estimateDurationMinutes(distanceKm: number): number {
  // ~40 km/h average for provincial roads
  return Math.max(1, Math.round((distanceKm / 40) * 60));
}

function extractSummary(data: unknown): {
  distanceMeters: number;
  durationSeconds: number;
} | null {
  const raw = data as {
    routes?: Array<{ summary?: { distance?: number; duration?: number } }>;
    features?: Array<{
      properties?: {
        summary?: { distance?: number; duration?: number };
        segments?: Array<{ distance?: number; duration?: number }>;
      };
    }>;
  };

  const fromRoutes = raw.routes?.[0]?.summary;
  if (
    fromRoutes &&
    typeof fromRoutes.distance === "number" &&
    typeof fromRoutes.duration === "number"
  ) {
    return {
      distanceMeters: fromRoutes.distance,
      durationSeconds: fromRoutes.duration,
    };
  }

  const props = raw.features?.[0]?.properties;
  const fromFeature = props?.summary;
  if (
    fromFeature &&
    typeof fromFeature.distance === "number" &&
    typeof fromFeature.duration === "number"
  ) {
    return {
      distanceMeters: fromFeature.distance,
      durationSeconds: fromFeature.duration,
    };
  }

  const segs = props?.segments;
  if (Array.isArray(segs) && segs.length > 0) {
    const distanceMeters = segs.reduce(
      (s, seg) => s + (Number(seg.distance) || 0),
      0,
    );
    const durationSeconds = segs.reduce(
      (s, seg) => s + (Number(seg.duration) || 0),
      0,
    );
    if (distanceMeters > 0 || durationSeconds > 0) {
      return { distanceMeters, durationSeconds };
    }
  }

  return null;
}

function haversineRoute(
  origin: RoutePlace,
  destination: RoutePlace,
): RouteResult | null {
  const straight = haversineKm(origin, destination);
  if (straight < 0.2) return null;
  const distanceKm = estimateRoadKm(straight);
  return {
    distanceKm,
    durationMinutes: estimateDurationMinutes(distanceKm),
    origin,
    destination,
    provider: "haversine_estimate",
  };
}

export const routeService = {
  async calculateRoute(params: {
    origin: RoutePlace;
    destination: RoutePlace;
  }): Promise<RouteResult> {
    if (
      !isInsideVietnam(params.origin.latitude, params.origin.longitude) ||
      !isInsideVietnam(
        params.destination.latitude,
        params.destination.longitude,
      )
    ) {
      throw new RouteServiceError(
        "NO_ROUTE",
        "Chỉ hỗ trợ tuyến đường trong Việt Nam. Vui lòng chọn lại địa chỉ.",
      );
    }

    const key = getOrsKey();
    const straight = haversineKm(params.origin, params.destination);

    // Same / near-identical points — cannot quote a trip
    if (straight < 0.15) {
      throw new RouteServiceError(
        "NO_ROUTE",
        "Không thể xác định tuyến đường. Vui lòng kiểm tra lại địa chỉ.",
      );
    }

    if (!key) {
      const fallback = haversineRoute(params.origin, params.destination);
      if (fallback) return fallback;
      throw new RouteServiceError(
        "MISSING_KEY",
        "Chưa cấu hình ORS_API_KEY trên server.",
      );
    }

    const body = {
      coordinates: [
        [params.origin.longitude, params.origin.latitude],
        [params.destination.longitude, params.destination.latitude],
      ],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/json",
        {
          method: "POST",
          headers: {
            Authorization: key,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );

      if (res.status === 404 || res.status === 400) {
        const fallback = haversineRoute(params.origin, params.destination);
        if (fallback) return fallback;
        throw new RouteServiceError(
          "NO_ROUTE",
          "Không thể xác định tuyến đường. Vui lòng kiểm tra lại địa chỉ.",
        );
      }
      if (!res.ok) {
        const fallback = haversineRoute(params.origin, params.destination);
        if (fallback) return fallback;
        throw new RouteServiceError(
          "UPSTREAM",
          "Không thể tính khoảng cách lúc này.",
        );
      }

      const data: unknown = await res.json();
      const summary = extractSummary(data);
      if (!summary) {
        const fallback = haversineRoute(params.origin, params.destination);
        if (fallback) return fallback;
        throw new RouteServiceError(
          "NO_ROUTE",
          "Không thể xác định tuyến đường. Vui lòng kiểm tra lại địa chỉ.",
        );
      }

      const distanceKm =
        Math.round((summary.distanceMeters / 1000) * 100) / 100;
      const durationMinutes = Math.max(
        1,
        Math.round(summary.durationSeconds / 60),
      );

      // ORS sometimes snaps both ends to the same node → 0km / tiny duration
      // while the true points are far apart (e.g. bad geocode). Use estimate.
      if (distanceKm < 0.2 && straight >= 0.5) {
        const fallback = haversineRoute(params.origin, params.destination);
        if (fallback) return fallback;
      }

      if (distanceKm < 0.05) {
        throw new RouteServiceError(
          "NO_ROUTE",
          "Không thể xác định tuyến đường. Vui lòng kiểm tra lại địa chỉ.",
        );
      }

      return {
        distanceKm,
        durationMinutes,
        origin: params.origin,
        destination: params.destination,
        provider: "openrouteservice",
      };
    } catch (e) {
      if (e instanceof RouteServiceError) throw e;
      if (e instanceof Error && e.name === "AbortError") {
        const fallback = haversineRoute(params.origin, params.destination);
        if (fallback) return fallback;
        throw new RouteServiceError(
          "TIMEOUT",
          "Không thể tính khoảng cách lúc này.",
        );
      }
      const fallback = haversineRoute(params.origin, params.destination);
      if (fallback) return fallback;
      throw new RouteServiceError(
        "UPSTREAM",
        "Không thể tính khoảng cách lúc này.",
      );
    } finally {
      clearTimeout(timer);
    }
  },
};

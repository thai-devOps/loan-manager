import { ApiError } from "@/api/client";
import type {
  CreateTripInput,
  TripBooking,
  Vehicle,
} from "@/features/ride/types/ride";

/** Public fetch — no auth redirect on 401. */
async function publicFetch<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers,
      body:
        options.body === undefined
          ? undefined
          : typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      0,
    );
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new ApiError(data.error ?? "Request failed", res.status);
  }
  return data as T;
}

export const tripService = {
  async createTrip(input: CreateTripInput): Promise<TripBooking> {
    return publicFetch<TripBooking>("/api/ride/bookings", {
      method: "POST",
      body: input,
    });
  },

  async getTrip(idOrCode: string): Promise<TripBooking | null> {
    try {
      return await publicFetch<TripBooking>(
        `/api/ride/bookings/lookup?code=${encodeURIComponent(idOrCode)}&phone=0000000000`,
      );
    } catch {
      return null;
    }
  },

  async lookupTrip(params: {
    bookingCode: string;
    phone: string;
  }): Promise<TripBooking | null> {
    try {
      return await publicFetch<TripBooking>(
        `/api/ride/bookings/lookup?code=${encodeURIComponent(params.bookingCode)}&phone=${encodeURIComponent(params.phone)}`,
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
};

export const publicVehicleService = {
  async getVehicles(): Promise<Vehicle[]> {
    const list = await publicFetch<Vehicle[]>("/api/ride/vehicles?active=1");
    return list.filter((v) => v.active && v.status === "AVAILABLE");
  },

  async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      const v = await publicFetch<Vehicle>(`/api/ride/vehicles/${id}`);
      if (!v.active || v.status !== "AVAILABLE") return null;
      return v;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  async getSuitableVehicles(params: {
    passengers: number;
    serviceType?: string;
  }): Promise<Vehicle[]> {
    const list = await publicVehicleService.getVehicles();
    const tagMap: Record<string, string> = {
      TRAVEL: "travel",
      MEDICAL: "medical",
      PILGRIMAGE: "pilgrimage",
      AIRPORT: "airport",
      BUSINESS: "business",
      CUSTOM: "custom",
    };
    const tag = params.serviceType
      ? tagMap[params.serviceType]
      : undefined;

    return list
      .filter((v) => {
        if (!v.active || v.status !== "AVAILABLE") return false;
        if (v.seats < params.passengers) return false;
        if (!tag || tag === "custom") return true;
        if (v.suitableFor.includes(tag as Vehicle["suitableFor"][number]))
          return true;
        if (tag === "travel" && v.suitableFor.includes("family")) return true;
        return false;
      })
      .sort((a, b) => a.seats - b.seats);
  },
};

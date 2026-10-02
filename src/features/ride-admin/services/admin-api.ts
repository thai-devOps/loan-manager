import { apiFetch } from "@/api/client";
import type {
  Driver,
  FleetReminder,
  PricingCalculateResult,
  PricingRulesListResponse,
  RideCustomer,
  RideCustomerDetail,
  RideDashboardData,
  RidePriceCell,
  RidePriceRoute,
  RidePriceTripType,
  RidePriceVehicleType,
  RidePricingRule,
  RideScheduleData,
  RideTrip,
  TripBooking,
  Vehicle,
} from "@/features/ride/types/ride";

export const bookingAdminService = {
  list(params?: {
    status?: string;
    q?: string;
    date?: string;
    serviceType?: string;
    vehicleId?: string;
    driverId?: string;
  }): Promise<TripBooking[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.q) qs.set("q", params.q);
    if (params?.date) qs.set("date", params.date);
    if (params?.serviceType) qs.set("serviceType", params.serviceType);
    if (params?.vehicleId) qs.set("vehicleId", params.vehicleId);
    if (params?.driverId) qs.set("driverId", params.driverId);
    const query = qs.toString();
    return apiFetch(`/api/ride/bookings${query ? `?${query}` : ""}`);
  },

  get(id: string): Promise<TripBooking> {
    return apiFetch(`/api/ride/bookings/${id}`);
  },

  action(id: string, body: Record<string, unknown>): Promise<TripBooking> {
    return apiFetch(`/api/ride/bookings/${id}`, { method: "PATCH", body });
  },

  delete(id: string): Promise<void> {
    return apiFetch(`/api/ride/bookings/${id}`, { method: "DELETE" });
  },
};

export const tripAdminService = {
  list(params?: {
    status?: string;
    q?: string;
    date?: string;
    from?: string;
    to?: string;
    vehicleId?: string;
    driverId?: string;
    tripType?: string;
  }): Promise<RideTrip[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.q) qs.set("q", params.q);
    if (params?.date) qs.set("date", params.date);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.vehicleId) qs.set("vehicleId", params.vehicleId);
    if (params?.driverId) qs.set("driverId", params.driverId);
    if (params?.tripType) qs.set("tripType", params.tripType);
    const query = qs.toString();
    return apiFetch(`/api/ride/trips${query ? `?${query}` : ""}`);
  },

  get(id: string): Promise<RideTrip> {
    return apiFetch(`/api/ride/trips/${id}`);
  },

  create(body: Record<string, unknown>): Promise<RideTrip> {
    return apiFetch("/api/ride/trips", { method: "POST", body });
  },

  update(id: string, body: Record<string, unknown>): Promise<RideTrip> {
    return apiFetch(`/api/ride/trips/${id}`, { method: "PATCH", body });
  },

  action(id: string, body: Record<string, unknown>): Promise<RideTrip> {
    return apiFetch(`/api/ride/trips/${id}`, { method: "PATCH", body });
  },

  delete(id: string): Promise<void> {
    return apiFetch(`/api/ride/trips/${id}`, { method: "DELETE" });
  },
};

export const customerAdminService = {
  list(params?: { q?: string; status?: string }): Promise<RideCustomer[]> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return apiFetch(`/api/ride/customers${query ? `?${query}` : ""}`);
  },

  get(
    id: string,
    includeHistory = false,
  ): Promise<RideCustomer | RideCustomerDetail> {
    const qs = includeHistory ? "?include=history" : "";
    return apiFetch(`/api/ride/customers/${id}${qs}`);
  },

  create(body: Record<string, unknown>): Promise<RideCustomer> {
    return apiFetch("/api/ride/customers", { method: "POST", body });
  },

  update(id: string, body: Record<string, unknown>): Promise<RideCustomer> {
    return apiFetch(`/api/ride/customers/${id}`, { method: "PATCH", body });
  },

  action(id: string, body: Record<string, unknown>): Promise<RideCustomer> {
    return apiFetch(`/api/ride/customers/${id}`, { method: "PATCH", body });
  },
};

export const vehicleAdminService = {
  list(): Promise<Vehicle[]> {
    return apiFetch("/api/ride/vehicles");
  },
  get(id: string): Promise<Vehicle> {
    return apiFetch(`/api/ride/vehicles/${id}`);
  },
  create(data: Partial<Vehicle>): Promise<Vehicle> {
    return apiFetch("/api/ride/vehicles", { method: "POST", body: data });
  },
  update(id: string, data: Partial<Vehicle> | Record<string, unknown>): Promise<Vehicle> {
    return apiFetch(`/api/ride/vehicles/${id}`, { method: "PATCH", body: data });
  },
  action(id: string, body: Record<string, unknown>): Promise<Vehicle> {
    return apiFetch(`/api/ride/vehicles/${id}`, { method: "PATCH", body });
  },
  odometerHistory(id: string): Promise<{
    vehicleId: string;
    currentOdometer: number | null;
    entries: Array<{
      tripId: string;
      tripCode: string;
      pickupDate: string;
      pickupTime: string;
      startOdometer: number | null;
      endOdometer: number | null;
      status: string;
    }>;
  }> {
    return apiFetch(`/api/ride/vehicles/${id}/odometer-history`);
  },
  delete(id: string): Promise<void> {
    return apiFetch(`/api/ride/vehicles/${id}`, { method: "DELETE" });
  },
};

export const driverAdminService = {
  list(): Promise<Driver[]> {
    return apiFetch("/api/ride/drivers");
  },
  get(id: string): Promise<Driver> {
    return apiFetch(`/api/ride/drivers/${id}`);
  },
  create(data: Partial<Driver>): Promise<Driver> {
    return apiFetch("/api/ride/drivers", { method: "POST", body: data });
  },
  update(id: string, data: Partial<Driver>): Promise<Driver> {
    return apiFetch(`/api/ride/drivers/${id}`, { method: "PATCH", body: data });
  },
};

export const dashboardService = {
  get(range: "today" | "7d" | "month" = "today"): Promise<RideDashboardData> {
    return apiFetch(`/api/ride/dashboard?range=${range}`);
  },
};

export const scheduleAdminService = {
  get(params: {
    date?: string;
    from?: string;
    to?: string;
    vehicleId?: string;
    driverId?: string;
    status?: string;
    serviceType?: string;
  }): Promise<RideScheduleData> {
    const qs = new URLSearchParams();
    if (params.date) qs.set("date", params.date);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.vehicleId) qs.set("vehicleId", params.vehicleId);
    if (params.driverId) qs.set("driverId", params.driverId);
    if (params.status) qs.set("status", params.status);
    if (params.serviceType) qs.set("serviceType", params.serviceType);
    const query = qs.toString();
    return apiFetch(`/api/ride/schedule${query ? `?${query}` : ""}`);
  },
};

export const remindersAdminService = {
  list(): Promise<FleetReminder[]> {
    return apiFetch("/api/ride/reminders");
  },
};

export const pricingRuleAdminService = {
  list(params?: {
    type?: string;
    status?: string;
    q?: string;
  }): Promise<PricingRulesListResponse> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.status) qs.set("status", params.status);
    if (params?.q) qs.set("q", params.q);
    const query = qs.toString();
    return apiFetch(`/api/ride/pricing-rules${query ? `?${query}` : ""}`);
  },
  get(id: string): Promise<RidePricingRule> {
    return apiFetch(`/api/ride/pricing-rules/${id}`);
  },
  create(body: Record<string, unknown>): Promise<RidePricingRule> {
    return apiFetch("/api/ride/pricing-rules", { method: "POST", body });
  },
  update(id: string, body: Record<string, unknown>): Promise<RidePricingRule> {
    return apiFetch(`/api/ride/pricing-rules/${id}`, {
      method: "PATCH",
      body,
    });
  },
  action(id: string, action: string): Promise<RidePricingRule> {
    return apiFetch(`/api/ride/pricing-rules/${id}`, {
      method: "PATCH",
      body: { action },
    });
  },
  delete(id: string): Promise<void> {
    return apiFetch(`/api/ride/pricing-rules/${id}`, { method: "DELETE" });
  },
  calculate(body: Record<string, unknown>): Promise<PricingCalculateResult> {
    return apiFetch("/api/ride/pricing/calculate", { method: "POST", body });
  },
};

export const priceMatrixAdminService = {
  listRoutes(): Promise<{ items: RidePriceRoute[] }> {
    return apiFetch("/api/ride/price-routes?all=1");
  },
  createRoute(body: Record<string, unknown>): Promise<RidePriceRoute> {
    return apiFetch("/api/ride/price-routes", { method: "POST", body });
  },
  updateRoute(
    id: string,
    body: Record<string, unknown>,
  ): Promise<RidePriceRoute> {
    return apiFetch(`/api/ride/price-routes/${id}`, {
      method: "PATCH",
      body,
    });
  },
  deleteRoute(id: string): Promise<void> {
    return apiFetch(`/api/ride/price-routes/${id}`, { method: "DELETE" });
  },
  listVehicles(): Promise<{ items: RidePriceVehicleType[] }> {
    return apiFetch("/api/ride/price-vehicle-types?all=1");
  },
  createVehicle(body: Record<string, unknown>): Promise<RidePriceVehicleType> {
    return apiFetch("/api/ride/price-vehicle-types", { method: "POST", body });
  },
  updateVehicle(
    id: string,
    body: Record<string, unknown>,
  ): Promise<RidePriceVehicleType> {
    return apiFetch(`/api/ride/price-vehicle-types/${id}`, {
      method: "PATCH",
      body,
    });
  },
  listTripTypes(): Promise<{ items: RidePriceTripType[] }> {
    return apiFetch("/api/ride/price-trip-types?all=1");
  },
  updateTripType(
    body: Record<string, unknown>,
  ): Promise<RidePriceTripType> {
    return apiFetch("/api/ride/price-trip-types", { method: "PATCH", body });
  },
  listCells(routeId?: string): Promise<{ items: RidePriceCell[] }> {
    const qs = routeId ? `?routeId=${encodeURIComponent(routeId)}` : "";
    return apiFetch(`/api/ride/price-cells${qs}`);
  },
  upsertCell(body: {
    routeId: string;
    vehicleTypeId: string;
    tripTypeId: string;
    amount: number | null;
  }): Promise<{ item: RidePriceCell | null }> {
    return apiFetch("/api/ride/price-cells", { method: "PUT", body });
  },
  upsertCellsBulk(
    cells: Array<{
      routeId: string;
      vehicleTypeId: string;
      tripTypeId: string;
      amount: number | null;
    }>,
  ): Promise<{ updated: number }> {
    return apiFetch("/api/ride/price-cells", {
      method: "PUT",
      body: { bulk: true, cells },
    });
  },
};

export type RideSettingsResponse = {
  bookingAntiSpamEnabled: boolean;
  bookingAntiSpamSource: "mongo" | "env";
  envDefault: boolean;
  operationalDistanceFactor: number;
  pricingEngineV2Enabled?: boolean;
};

export type PricingV2QuoteRequest = {
  vehicleId: string;
  origin: { address: string; latitude?: number | null; longitude?: number | null };
  destination: {
    address: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  tripType: string;
  routeType?: string;
  waitingHours?: number;
  tolls?: { name: string; amount: number }[];
  otherCosts?: number;
  travelDate: string;
  bookingId?: string;
  distanceKm?: number;
  durationMinutes?: number;
};

export type PricingV2QuoteResponse = {
  success: boolean;
  pricingEngineVersion?: string;
  calculationId?: string;
  display?: string;
  amount?: number | null;
  autoQuote?: boolean;
  route?: {
    distanceKm: number;
    oneWayDistanceKm?: number;
    pricingDistanceKm?: number;
    durationMinutes: number;
    routeType: string;
    operationalDistanceKm?: number;
    operationalDistanceFactor?: number;
    source?: string;
    provider?: string;
  };
  fuel?: {
    fuelType: string;
    pricePerLiter: number | null;
    source: string;
    sourceDate: string | null;
    fuelPriceStatus: string;
    consumptionLPer100Km: number | null;
    consumptionSource?: string;
    estimatedLiters: number;
    fuelCost: number;
  };
  cost?: {
    fuel: number;
    driver: number;
    waiting: number;
    toll: number;
    depreciation: number;
    operating: number;
    other: number;
    total: number;
  };
  pricing?: {
    strategy?: string;
    basePrice: number;
    costPlusPrice?: number;
    recommendedPrice: number;
    recommendedPriceBeforeRound?: number;
    finalPrice: number;
    minimumTripPrice?: number;
    targetMargin?: number;
  };
  profit?: number;
  margin?: number;
  marginPercent?: number;
  warnings?: string[];
  snapshot?: import("@/features/ride/types/ride").BookingQuoteSnapshot | null;
  error?: string;
  code?: string;
};

export const pricingV2AdminService = {
  quote(body: PricingV2QuoteRequest): Promise<PricingV2QuoteResponse> {
    return apiFetch("/api/ride/pricing/quote", { method: "POST", body });
  },
};

export const rideSettingsAdminService = {
  get(): Promise<RideSettingsResponse> {
    return apiFetch("/api/ride/settings");
  },
  update(body: {
    bookingAntiSpamEnabled?: boolean | null;
    operationalDistanceFactor?: number | null;
  }): Promise<RideSettingsResponse> {
    return apiFetch("/api/ride/settings", { method: "PATCH", body });
  },
};

export type AvailabilityOption = {
  id: string;
  name: string;
  available: boolean;
  conflictLabel?: string;
  licensePlate?: string;
  seats?: number;
  phone?: string;
  status?: string;
};

export type FuelPriceProductDto = {
  code: string;
  name: string;
  price: number;
  change: number | null;
  unit: "VND/L";
};

export type FuelPriceCurrentDto = {
  source: "PVOIL";
  effectiveAt: string;
  effectiveDateRaw: string;
  crawledAt: string;
  products: FuelPriceProductDto[];
};

export type FuelPriceHistoryDto = {
  items: Array<
    FuelPriceCurrentDto & {
      id: string;
      createdAt: string;
      updatedAt: string;
      sourceUrl?: string;
    }
  >;
  page: number;
  limit: number;
  total: number;
};

export type FuelSyncResultDto = {
  ok: true;
  status: "synced" | "already_synced" | "failed";
  source: "PVOIL";
  effectiveAt?: string;
  effectiveDateRaw?: string;
  productCount?: number;
  products?: FuelPriceProductDto[];
  crawledAt?: string;
};

export const fuelPriceAdminService = {
  current(): Promise<FuelPriceCurrentDto> {
    return apiFetch("/api/fuel/current");
  },

  history(params?: {
    page?: number;
    limit?: number;
  }): Promise<FuelPriceHistoryDto> {
    const qs = new URLSearchParams();
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.limit != null) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return apiFetch(`/api/fuel/history${q ? `?${q}` : ""}`);
  },

  sync(body?: { date?: string }): Promise<FuelSyncResultDto> {
    return apiFetch("/api/admin/fuel/sync", {
      method: "POST",
      body: body ?? {},
    });
  },
};

export const availabilityAdminService = {
  get(params: {
    tripId?: string;
    bookingId?: string;
    pickupDate?: string;
    pickupTime?: string;
    returnDate?: string;
    returnTime?: string;
    durationMinutes?: number;
  }): Promise<{
    startMs: number;
    endMs: number;
    vehicles: AvailabilityOption[];
    drivers: AvailabilityOption[];
  }> {
    const qs = new URLSearchParams();
    if (params.tripId) qs.set("tripId", params.tripId);
    if (params.bookingId) qs.set("bookingId", params.bookingId);
    if (params.pickupDate) qs.set("pickupDate", params.pickupDate);
    if (params.pickupTime) qs.set("pickupTime", params.pickupTime);
    if (params.returnDate) qs.set("returnDate", params.returnDate);
    if (params.returnTime) qs.set("returnTime", params.returnTime);
    if (params.durationMinutes != null) {
      qs.set("durationMinutes", String(params.durationMinutes));
    }
    return apiFetch(`/api/ride/availability?${qs.toString()}`);
  },
};

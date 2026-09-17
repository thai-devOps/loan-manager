import { apiFetch } from "@/api/client";
import type {
  Driver,
  RideCustomer,
  RideCustomerDetail,
  RideDashboardData,
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
  update(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    return apiFetch(`/api/ride/vehicles/${id}`, { method: "PATCH", body: data });
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

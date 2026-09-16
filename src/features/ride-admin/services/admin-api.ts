import { apiFetch } from "@/api/client";
import type {
  Driver,
  RideDashboardData,
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

  action(
    id: string,
    body: Record<string, unknown>,
  ): Promise<TripBooking> {
    return apiFetch(`/api/ride/bookings/${id}`, {
      method: "PATCH",
      body,
    });
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
    return apiFetch(`/api/ride/vehicles/${id}`, {
      method: "PATCH",
      body: data,
    });
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
    return apiFetch(`/api/ride/drivers/${id}`, {
      method: "PATCH",
      body: data,
    });
  },
};

export const dashboardService = {
  get(range: "today" | "7d" | "month" = "today"): Promise<RideDashboardData> {
    return apiFetch(`/api/ride/dashboard?range=${range}`);
  },
};

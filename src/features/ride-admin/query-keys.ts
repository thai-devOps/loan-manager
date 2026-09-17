export const rideAdminQueryKeys = {
  all: ["ride-admin"] as const,
  bookings: (filters: {
    status?: string;
    q?: string;
    date?: string;
    serviceType?: string;
    vehicleId?: string;
    driverId?: string;
  }) => [...rideAdminQueryKeys.all, "bookings", filters] as const,
  bookingsRoot: () => [...rideAdminQueryKeys.all, "bookings"] as const,
  dashboard: (range: "today" | "7d" | "month") =>
    [...rideAdminQueryKeys.all, "dashboard", range] as const,
  dashboardRoot: () => [...rideAdminQueryKeys.all, "dashboard"] as const,
  vehicles: () => [...rideAdminQueryKeys.all, "vehicles"] as const,
  drivers: () => [...rideAdminQueryKeys.all, "drivers"] as const,
};

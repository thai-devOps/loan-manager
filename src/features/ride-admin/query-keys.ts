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
  schedule: (filters: {
    from?: string;
    to?: string;
    vehicleId?: string;
    driverId?: string;
    status?: string;
  }) => [...rideAdminQueryKeys.all, "schedule", filters] as const,
  scheduleRoot: () => [...rideAdminQueryKeys.all, "schedule"] as const,
  reminders: () => [...rideAdminQueryKeys.all, "reminders"] as const,
  trip: (id: string) => [...rideAdminQueryKeys.all, "trip", id] as const,
  pricingRules: (filters: { type?: string; status?: string; q?: string }) =>
    [...rideAdminQueryKeys.all, "pricing-rules", filters] as const,
  pricingRulesRoot: () => [...rideAdminQueryKeys.all, "pricing-rules"] as const,
  pricingRule: (id: string) =>
    [...rideAdminQueryKeys.all, "pricing-rule", id] as const,
  priceMatrix: () => [...rideAdminQueryKeys.all, "price-matrix"] as const,
  priceRoutes: () => [...rideAdminQueryKeys.all, "price-routes"] as const,
  priceVehicles: () => [...rideAdminQueryKeys.all, "price-vehicles"] as const,
  priceTripTypes: () =>
    [...rideAdminQueryKeys.all, "price-trip-types"] as const,
  priceCells: (routeId?: string) =>
    [...rideAdminQueryKeys.all, "price-cells", routeId ?? "all"] as const,
};

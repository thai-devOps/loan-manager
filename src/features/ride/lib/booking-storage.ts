import type { TripBooking } from "@/features/ride/types/ride";

const STORAGE_KEY = "ride.tripBookings.v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readTrips(): TripBooking[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getSeedTrips();
    const parsed = JSON.parse(raw) as TripBooking[];
    if (!Array.isArray(parsed)) return getSeedTrips();
    return parsed;
  } catch {
    return getSeedTrips();
  }
}

export function writeTrips(trips: TripBooking[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

export function saveTrip(trip: TripBooking): TripBooking {
  const trips = readTrips();
  const next = [trip, ...trips.filter((t) => t.id !== trip.id)];
  writeTrips(next);
  return trip;
}

/** Demo trip for lookup UX (DRIVER_ASSIGNED). Seeded once when storage empty. */
function getSeedTrips(): TripBooking[] {
  const seed: TripBooking[] = [
    {
      id: "seed-trip-demo",
      bookingCode: "TRIP1025",
      serviceType: "TRAVEL",
      pickup: { address: "Long Xuyên, An Giang" },
      destination: { address: "Châu Đốc, An Giang" },
      pickupDate: "2026-09-20",
      pickupTime: "07:00",
      tripType: "ROUND_TRIP",
      passengers: 4,
      vehicleId: "v-fortuner",
      customer: { name: "Khách demo", phone: "0900000000" },
      note: "Chuyến demo để tra cứu — mã TRIP1025 / SĐT 0900000000",
      quotedPrice: null,
      status: "DRIVER_ASSIGNED",
      driver: {
        name: "Nguyễn Văn A",
        phone: "",
        vehiclePlate: "67A-xxxxx",
      },
      createdAt: new Date().toISOString(),
    },
  ];
  if (canUseStorage()) {
    writeTrips(seed);
  }
  return seed;
}

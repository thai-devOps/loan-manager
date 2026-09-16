import {
  generateBookingCode,
  normalizeBookingCode,
  normalizePhone,
} from "@/features/ride/lib/booking-code";
import { readTrips, saveTrip } from "@/features/ride/lib/booking-storage";
import type {
  CreateTripInput,
  TripBooking,
} from "@/features/ride/types/ride";
import { vehicleService } from "@/features/ride/services/vehicleService";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const tripService = {
  async createTrip(input: CreateTripInput): Promise<TripBooking> {
    const vehicle = await vehicleService.getVehicleById(input.vehicleId);
    if (!vehicle) {
      throw new Error("Xe không còn khả dụng. Vui lòng chọn xe khác.");
    }
    if (vehicle.seats < input.passengers) {
      throw new Error("Số khách vượt quá số chỗ của xe đã chọn.");
    }

    const existing = readTrips();
    const bookingCode = generateBookingCode(
      existing.map((t) => t.bookingCode),
    );

    const trip: TripBooking = {
      id: createId(),
      bookingCode,
      serviceType: input.serviceType,
      pickup: {
        address: input.pickup.address.trim(),
        latitude: input.pickup.latitude ?? null,
        longitude: input.pickup.longitude ?? null,
      },
      destination: {
        address: input.destination.address.trim(),
        latitude: input.destination.latitude ?? null,
        longitude: input.destination.longitude ?? null,
      },
      pickupDate: input.pickupDate,
      pickupTime: input.pickupTime,
      tripType: input.tripType,
      passengers: input.passengers,
      vehicleId: input.vehicleId,
      customer: {
        name: input.customer.name.trim(),
        phone: input.customer.phone.trim(),
      },
      note: input.note?.trim() || undefined,
      quotedPrice: null,
      status: "PENDING",
      driver: null,
      createdAt: new Date().toISOString(),
    };

    return saveTrip(trip);
  },

  async getTrip(idOrCode: string): Promise<TripBooking | null> {
    const trips = readTrips();
    const code = normalizeBookingCode(idOrCode);
    return (
      trips.find((t) => t.id === idOrCode || t.bookingCode === code) ?? null
    );
  },

  async lookupTrip(params: {
    bookingCode: string;
    phone: string;
  }): Promise<TripBooking | null> {
    const code = normalizeBookingCode(params.bookingCode);
    const phone = normalizePhone(params.phone);
    const trips = readTrips();
    return (
      trips.find(
        (t) =>
          t.bookingCode === code &&
          normalizePhone(t.customer.phone) === phone,
      ) ?? null
    );
  },
};

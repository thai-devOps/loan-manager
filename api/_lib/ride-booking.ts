import type {
  BookingStatus,
  RideBooking,
  RideDriver,
  RideVehicle,
} from "./ride-types.js";
import {
  rideBookingsCol,
  rideDriversCol,
  rideVehiclesCol,
} from "./mongo.js";
import { ensureTripFromBooking } from "./ride-trip.js";

const ACTIVE_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "IN_PROGRESS",
];

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function normalizeBookingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/^#/, "");
}

export async function generateBookingCode(): Promise<string> {
  const col = await rideBookingsCol();
  for (let i = 0; i < 40; i++) {
    const code = `TRIP${1000 + Math.floor(Math.random() * 9000)}`;
    const exists = await col.findOne({ bookingCode: code }, { projection: { id: 1 } });
    if (!exists) return code;
  }
  return `TRIP${Date.now().toString().slice(-6)}`;
}

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  if (from === to) return true;
  const map: Record<BookingStatus, BookingStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["DRIVER_ASSIGNED", "CANCELLED"],
    DRIVER_ASSIGNED: ["DRIVER_ARRIVING", "IN_PROGRESS", "CANCELLED"],
    DRIVER_ARRIVING: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  return map[from]?.includes(to) ?? false;
}

/** Same calendar day conflict — MVP window check by date. */
export async function hasVehicleConflict(params: {
  vehicleId: string;
  pickupDate: string;
  excludeBookingId?: string;
}): Promise<boolean> {
  if (!params.vehicleId) return false;
  const col = await rideBookingsCol();
  const filter: Record<string, unknown> = {
    vehicleId: params.vehicleId,
    pickupDate: params.pickupDate,
    status: { $in: ACTIVE_STATUSES },
  };
  if (params.excludeBookingId) {
    filter.id = { $ne: params.excludeBookingId };
  }
  const hit = await col.findOne(filter, { projection: { id: 1 } });
  return Boolean(hit);
}

export async function hasDriverConflict(params: {
  driverId: string;
  pickupDate: string;
  excludeBookingId?: string;
}): Promise<boolean> {
  if (!params.driverId) return false;
  const col = await rideBookingsCol();
  const filter: Record<string, unknown> = {
    driverId: params.driverId,
    pickupDate: params.pickupDate,
    status: { $in: ACTIVE_STATUSES },
  };
  if (params.excludeBookingId) {
    filter.id = { $ne: params.excludeBookingId };
  }
  const hit = await col.findOne(filter, { projection: { id: 1 } });
  return Boolean(hit);
}

/** Upsert full trip from booking (replaces thin stub). */
export async function ensureTripStub(booking: RideBooking): Promise<string | null> {
  return ensureTripFromBooking(booking);
}

export async function buildDriverSnapshot(
  driverId: string,
  vehicleId: string,
): Promise<{ name: string; phone: string; vehiclePlate: string } | null> {
  const drivers = await rideDriversCol();
  const vehicles = await rideVehiclesCol();
  const driver = await drivers.findOne({ id: driverId });
  if (!driver) return null;
  const vehicle = await vehicles.findOne({ id: vehicleId });
  return {
    name: driver.name,
    phone: driver.phone,
    vehiclePlate: vehicle?.licensePlate || vehicle?.name || "",
  };
}

export type { RideVehicle, RideDriver, RideBooking };

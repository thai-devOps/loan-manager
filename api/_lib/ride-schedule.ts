import type {
  BookingStatus,
  RideBooking,
  RideDriver,
  RideTrip,
  RideVehicle,
  TripStatus,
} from "./ride-types.js";
import {
  rideBookingsCol,
  rideDriversCol,
  rideTripsCol,
  rideVehiclesCol,
  stripDoc,
} from "./mongo.js";
import { normalizeTripDoc } from "./ride-trip.js";

export const DEFAULT_TRIP_DURATION_MINUTES = 180;

const ACTIVE_TRIP_STATUSES: TripStatus[] = [
  "CONFIRMED",
  "ASSIGNED",
  "IN_PROGRESS",
];

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "IN_PROGRESS",
];

export type TimeWindow = { startMs: number; endMs: number };

/** Parse `YYYY-MM-DD` + `HH:mm` to epoch ms (local). */
export function parseDateTimeMs(date: string, time: string): number {
  const t = (time || "00:00").trim();
  const normalized = t.length === 5 ? `${t}:00` : t;
  const ms = new Date(`${date}T${normalized}`).getTime();
  return Number.isFinite(ms) ? ms : new Date(`${date}T00:00:00`).getTime();
}

export function intervalsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function tripWindow(
  trip: Pick<
    RideTrip,
    | "pickupDate"
    | "pickupTime"
    | "returnDate"
    | "returnTime"
    | "plannedEndAt"
    | "plannedDurationMinutes"
  >,
  durationMinutes?: number | null,
): TimeWindow {
  const startMs = parseDateTimeMs(trip.pickupDate, trip.pickupTime || "00:00");
  if (trip.plannedEndAt) {
    const endMs = new Date(trip.plannedEndAt).getTime();
    if (Number.isFinite(endMs) && endMs > startMs) {
      return { startMs, endMs };
    }
  }
  if (trip.returnDate && trip.returnTime) {
    const endMs = parseDateTimeMs(trip.returnDate, trip.returnTime);
    if (endMs > startMs) return { startMs, endMs };
  }
  const mins =
    trip.plannedDurationMinutes ??
    durationMinutes ??
    DEFAULT_TRIP_DURATION_MINUTES;
  return { startMs, endMs: startMs + Math.max(30, mins) * 60_000 };
}

export function bookingWindow(
  booking: Pick<
    RideBooking,
    "pickupDate" | "pickupTime" | "quoteSnapshot"
  >,
): TimeWindow {
  const startMs = parseDateTimeMs(
    booking.pickupDate,
    booking.pickupTime || "00:00",
  );
  const mins =
    booking.quoteSnapshot?.durationMinutes ?? DEFAULT_TRIP_DURATION_MINUTES;
  return { startMs, endMs: startMs + Math.max(30, mins) * 60_000 };
}

function dateNeighbors(isoDate: string): string[] {
  const d = new Date(`${isoDate}T12:00:00`);
  const out: string[] = [];
  for (const offset of [-1, 0, 1]) {
    const x = new Date(d);
    x.setDate(x.getDate() + offset);
    out.push(
      `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`,
    );
  }
  return out;
}

export async function findTripVehicleConflict(params: {
  vehicleId: string;
  window: TimeWindow;
  excludeTripId?: string;
}): Promise<RideTrip | null> {
  if (!params.vehicleId) return null;
  const col = await rideTripsCol();
  const startDate = new Date(params.window.startMs).toISOString().slice(0, 10);
  const dates = dateNeighbors(startDate);
  const rows = await col
    .find({
      vehicleId: params.vehicleId,
      pickupDate: { $in: dates },
      status: { $in: ACTIVE_TRIP_STATUSES },
      ...(params.excludeTripId ? { id: { $ne: params.excludeTripId } } : {}),
    })
    .toArray();
  for (const raw of rows) {
    const trip = normalizeTripDoc(raw);
    if (intervalsOverlap(params.window, tripWindow(trip))) return trip;
  }
  return null;
}

export async function findTripDriverConflict(params: {
  driverId: string;
  window: TimeWindow;
  excludeTripId?: string;
}): Promise<RideTrip | null> {
  if (!params.driverId) return null;
  const col = await rideTripsCol();
  const startDate = new Date(params.window.startMs).toISOString().slice(0, 10);
  const dates = dateNeighbors(startDate);
  const rows = await col
    .find({
      driverId: params.driverId,
      pickupDate: { $in: dates },
      status: { $in: ACTIVE_TRIP_STATUSES },
      ...(params.excludeTripId ? { id: { $ne: params.excludeTripId } } : {}),
    })
    .toArray();
  for (const raw of rows) {
    const trip = normalizeTripDoc(raw);
    if (intervalsOverlap(params.window, tripWindow(trip))) return trip;
  }
  return null;
}

export async function findBookingVehicleConflict(params: {
  vehicleId: string;
  window: TimeWindow;
  excludeBookingId?: string;
}): Promise<RideBooking | null> {
  if (!params.vehicleId) return null;
  const col = await rideBookingsCol();
  const startDate = new Date(params.window.startMs).toISOString().slice(0, 10);
  const dates = dateNeighbors(startDate);
  const rows = await col
    .find({
      vehicleId: params.vehicleId,
      pickupDate: { $in: dates },
      status: { $in: ACTIVE_BOOKING_STATUSES },
      ...(params.excludeBookingId
        ? { id: { $ne: params.excludeBookingId } }
        : {}),
    })
    .toArray();
  for (const booking of rows) {
    if (intervalsOverlap(params.window, bookingWindow(booking))) return booking;
  }
  return null;
}

export async function findBookingDriverConflict(params: {
  driverId: string;
  window: TimeWindow;
  excludeBookingId?: string;
}): Promise<RideBooking | null> {
  if (!params.driverId) return null;
  const col = await rideBookingsCol();
  const startDate = new Date(params.window.startMs).toISOString().slice(0, 10);
  const dates = dateNeighbors(startDate);
  const rows = await col
    .find({
      driverId: params.driverId,
      pickupDate: { $in: dates },
      status: { $in: ACTIVE_BOOKING_STATUSES },
      ...(params.excludeBookingId
        ? { id: { $ne: params.excludeBookingId } }
        : {}),
    })
    .toArray();
  for (const booking of rows) {
    if (intervalsOverlap(params.window, bookingWindow(booking))) return booking;
  }
  return null;
}

function formatHm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type ScheduleItem = {
  kind: "trip" | "booking";
  id: string;
  code: string;
  status: string;
  serviceType?: string | null;
  customerName: string;
  pickupAddress: string;
  destinationAddress: string;
  startAt: string;
  endAt: string;
  startMs: number;
  endMs: number;
  vehicleId: string | null;
  driverId: string | null;
  tripId?: string | null;
  bookingId?: string | null;
  needsVehicle: boolean;
  needsDriver: boolean;
};

export type ScheduleResponse = {
  from: string;
  to: string;
  vehicles: Omit<RideVehicle, "_id">[];
  drivers: Omit<RideDriver, "_id">[];
  items: ScheduleItem[];
  summary: {
    total: number;
    assigned: number;
    unassigned: number;
  };
};

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

export async function buildSchedule(params: {
  from: string;
  to: string;
  vehicleId?: string;
  driverId?: string;
  status?: string;
  serviceType?: string;
}): Promise<ScheduleResponse> {
  const tripsCol = await rideTripsCol();
  const bookingsCol = await rideBookingsCol();
  const vehiclesCol = await rideVehiclesCol();
  const driversCol = await rideDriversCol();

  const tripFilter: Record<string, unknown> = {
    pickupDate: { $gte: params.from, $lte: params.to },
    status: { $in: ACTIVE_TRIP_STATUSES },
  };
  if (params.vehicleId) tripFilter.vehicleId = params.vehicleId;
  if (params.driverId) tripFilter.driverId = params.driverId;
  if (params.status) tripFilter.status = params.status;

  const bookingFilter: Record<string, unknown> = {
    pickupDate: { $gte: params.from, $lte: params.to },
    status: "CONFIRMED",
    $or: [{ tripId: null }, { tripId: { $exists: false } }, { tripId: "" }],
  };
  if (params.vehicleId) bookingFilter.vehicleId = params.vehicleId;
  if (params.driverId) bookingFilter.driverId = params.driverId;
  if (params.serviceType) bookingFilter.serviceType = params.serviceType;

  const [tripRows, bookingRows, vehicles, drivers] = await Promise.all([
    tripsCol.find(tripFilter).sort({ pickupDate: 1, pickupTime: 1 }).toArray(),
    bookingsCol
      .find(bookingFilter)
      .sort({ pickupDate: 1, pickupTime: 1 })
      .toArray(),
    vehiclesCol.find({ active: true }).sort({ name: 1 }).toArray(),
    driversCol.find({ active: true }).sort({ name: 1 }).toArray(),
  ]);

  const items: ScheduleItem[] = [];

  for (const raw of tripRows) {
    const trip = normalizeTripDoc(raw);
    if (params.serviceType) {
      // serviceType lives on booking; skip filter if unknown
    }
    const win = tripWindow(trip);
    items.push({
      kind: "trip",
      id: trip.id,
      code: trip.tripCode,
      status: trip.status,
      customerName: trip.customer.name,
      pickupAddress: trip.pickup.address,
      destinationAddress: trip.destination.address,
      startAt: isoFromMs(win.startMs),
      endAt: isoFromMs(win.endMs),
      startMs: win.startMs,
      endMs: win.endMs,
      vehicleId: trip.vehicleId ?? null,
      driverId: trip.driverId ?? null,
      tripId: trip.id,
      bookingId: trip.bookingId ?? null,
      needsVehicle: !trip.vehicleId,
      needsDriver: !trip.driverId,
    });
  }

  for (const booking of bookingRows) {
    if (params.serviceType && booking.serviceType !== params.serviceType) {
      continue;
    }
    const win = bookingWindow(booking);
    items.push({
      kind: "booking",
      id: booking.id,
      code: booking.bookingCode,
      status: booking.status,
      serviceType: booking.serviceType,
      customerName: booking.customer.name,
      pickupAddress: booking.pickup.address,
      destinationAddress: booking.destination.address,
      startAt: isoFromMs(win.startMs),
      endAt: isoFromMs(win.endMs),
      startMs: win.startMs,
      endMs: win.endMs,
      vehicleId: booking.vehicleId || null,
      driverId: booking.driverId ?? null,
      tripId: booking.tripId ?? null,
      bookingId: booking.id,
      needsVehicle: !booking.vehicleId,
      needsDriver: !booking.driverId,
    });
  }

  items.sort((a, b) => a.startMs - b.startMs);

  const assigned = items.filter((i) => !i.needsVehicle && !i.needsDriver).length;
  const unassigned = items.filter(
    (i) => i.needsVehicle || i.needsDriver,
  ).length;

  return {
    from: params.from,
    to: params.to,
    vehicles: vehicles.map((v) => stripDoc(v)),
    drivers: drivers.map((d) => stripDoc(d)),
    items,
    summary: {
      total: items.length,
      assigned,
      unassigned,
    },
  };
}

export function conflictMessage(
  kind: "vehicle" | "driver",
  window: TimeWindow,
): string {
  const label = kind === "vehicle" ? "Xe" : "Tài xế";
  return `${label} đã có chuyến trong khoảng thời gian này (${formatHm(window.startMs)}–${formatHm(window.endMs)}).`;
}

export async function listAvailability(params: {
  startMs: number;
  endMs: number;
  excludeTripId?: string;
  excludeBookingId?: string;
}): Promise<{
  vehicles: Array<{
    vehicle: Omit<RideVehicle, "_id">;
    available: boolean;
    conflictLabel?: string;
  }>;
  drivers: Array<{
    driver: Omit<RideDriver, "_id">;
    available: boolean;
    conflictLabel?: string;
  }>;
}> {
  const window: TimeWindow = {
    startMs: params.startMs,
    endMs: params.endMs,
  };
  const vehiclesCol = await rideVehiclesCol();
  const driversCol = await rideDriversCol();
  const [vehicles, drivers] = await Promise.all([
    vehiclesCol.find({ active: true }).sort({ name: 1 }).toArray(),
    driversCol.find({ active: true }).sort({ name: 1 }).toArray(),
  ]);

  const vehicleResults = [];
  for (const v of vehicles) {
    const tripHit = await findTripVehicleConflict({
      vehicleId: v.id,
      window,
      excludeTripId: params.excludeTripId,
    });
    const bookingHit = tripHit
      ? null
      : await findBookingVehicleConflict({
          vehicleId: v.id,
          window,
          excludeBookingId: params.excludeBookingId,
        });
    const hit = tripHit || bookingHit;
    vehicleResults.push({
      vehicle: stripDoc(v),
      available: !hit,
      conflictLabel: hit
        ? `Đang có chuyến ${formatHm(window.startMs)}–${formatHm(window.endMs)}`
        : undefined,
    });
  }

  const driverResults = [];
  for (const d of drivers) {
    const tripHit = await findTripDriverConflict({
      driverId: d.id,
      window,
      excludeTripId: params.excludeTripId,
    });
    const bookingHit = tripHit
      ? null
      : await findBookingDriverConflict({
          driverId: d.id,
          window,
          excludeBookingId: params.excludeBookingId,
        });
    const hit = tripHit || bookingHit;
    driverResults.push({
      driver: stripDoc(d),
      available: !hit,
      conflictLabel: hit
        ? `Đang có chuyến ${formatHm(window.startMs)}–${formatHm(window.endMs)}`
        : undefined,
    });
  }

  return { vehicles: vehicleResults, drivers: driverResults };
}

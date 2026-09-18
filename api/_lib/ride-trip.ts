import { randomUUID } from "node:crypto";
import type { RideBooking } from "./ride-types.js";
import type {
  Place,
  RideTrip,
  TripStatus,
  TripStatusEvent,
  TripType,
} from "./ride-types.js";
import { rideBookingsCol, rideTripsCol } from "./mongo.js";

export function canTransitionTrip(from: TripStatus, to: TripStatus): boolean {
  if (from === to) return true;
  const map: Record<TripStatus, TripStatus[]> = {
    DRAFT: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["ASSIGNED", "CANCELLED"],
    ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  return map[from]?.includes(to) ?? false;
}

export function nextTripStatuses(from: TripStatus): TripStatus[] {
  const map: Record<TripStatus, TripStatus[]> = {
    DRAFT: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["ASSIGNED", "CANCELLED"],
    ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  return map[from] ?? [];
}

export function bookingStatusToTripStatus(status: RideBooking["status"]): TripStatus {
  switch (status) {
    case "PENDING":
      return "DRAFT";
    case "CONFIRMED":
      return "CONFIRMED";
    case "DRIVER_ASSIGNED":
    case "DRIVER_ARRIVING":
      return "ASSIGNED";
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
}

export function pushStatusEvent(
  history: TripStatusEvent[] | undefined,
  status: TripStatus,
  opts?: { byUserId?: string | null; note?: string; at?: string },
): TripStatusEvent[] {
  const event: TripStatusEvent = {
    status,
    at: opts?.at ?? new Date().toISOString(),
    byUserId: opts?.byUserId ?? null,
    note: opts?.note,
  };
  return [...(history ?? []), event];
}

export async function generateTripCode(): Promise<string> {
  const col = await rideTripsCol();
  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  for (let i = 0; i < 40; i++) {
    const suffix = String(1000 + Math.floor(Math.random() * 9000));
    const code = `TR-${day}-${suffix}`;
    const exists = await col.findOne({ tripCode: code }, { projection: { id: 1 } });
    if (!exists) return code;
  }
  return `TR-${day}-${Date.now().toString().slice(-4)}`;
}

function routeLabelFromPlaces(pickup: Place, destination: Place): string {
  const a = pickup.address?.trim() || "—";
  const b = destination.address?.trim() || "—";
  return `${a} → ${b}`;
}

export type CreateTripInput = {
  bookingId?: string | null;
  bookingCode?: string | null;
  customerId?: string | null;
  customer: { name: string; phone: string };
  pickup: Place;
  destination: Place;
  routeLabel?: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string | null;
  returnTime?: string | null;
  vehicleId?: string | null;
  driverId?: string | null;
  tripType: TripType;
  passengers: number;
  note?: string;
  tripPrice?: number;
  expenseTotal?: number;
  revenueAmount?: number;
  status?: TripStatus;
  byUserId?: string | null;
};

export async function buildTripDocument(
  input: CreateTripInput,
): Promise<RideTrip> {
  const now = new Date().toISOString();
  const status = input.status ?? "DRAFT";
  const id = randomUUID();
  const tripCode = await generateTripCode();
  const pickup = {
    address: String(input.pickup?.address ?? "").trim(),
    latitude: input.pickup?.latitude ?? null,
    longitude: input.pickup?.longitude ?? null,
  };
  const destination = {
    address: String(input.destination?.address ?? "").trim(),
    latitude: input.destination?.latitude ?? null,
    longitude: input.destination?.longitude ?? null,
  };
  const tripPrice = Number(input.tripPrice ?? 0);
  return {
    _id: id,
    id,
    tripCode,
    bookingId: input.bookingId ?? null,
    bookingCode: input.bookingCode ?? null,
    customerId: input.customerId ?? null,
    customer: {
      name: String(input.customer.name ?? "").trim(),
      phone: String(input.customer.phone ?? "").trim(),
    },
    pickup,
    destination,
    routeLabel:
      input.routeLabel?.trim() || routeLabelFromPlaces(pickup, destination),
    pickupDate: input.pickupDate,
    pickupTime: input.pickupTime,
    returnDate: input.returnDate ?? null,
    returnTime: input.returnTime ?? null,
    vehicleId: input.vehicleId || null,
    driverId: input.driverId || null,
    tripType: input.tripType,
    passengers: Math.max(1, Number(input.passengers) || 1),
    note: input.note?.trim() || undefined,
    tripPrice: Number.isFinite(tripPrice) ? tripPrice : 0,
    expenseTotal: Number(input.expenseTotal ?? 0) || 0,
    revenueAmount: Number(input.revenueAmount ?? 0) || 0,
    status,
    statusHistory: pushStatusEvent([], status, { byUserId: input.byUserId }),
    createdAt: now,
    updatedAt: now,
  };
}

export async function createTripFromBooking(
  booking: RideBooking,
  opts?: { byUserId?: string | null; status?: TripStatus },
): Promise<RideTrip> {
  const trips = await rideTripsCol();
  const existing = booking.tripId
    ? await trips.findOne({ id: booking.tripId })
    : await trips.findOne({ bookingId: booking.id });
  if (existing) return existing;

  let status =
    opts?.status ?? bookingStatusToTripStatus(booking.status);
  if (status === "DRAFT" && booking.status !== "PENDING") {
    status = "CONFIRMED";
  }
  if (
    (status === "ASSIGNED" || status === "IN_PROGRESS" || status === "COMPLETED") &&
    (!booking.vehicleId || !booking.driverId)
  ) {
    status = "CONFIRMED";
  }

  const trip = await buildTripDocument({
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    customerId: booking.customerId ?? null,
    customer: booking.customer,
    pickup: booking.pickup,
    destination: booking.destination,
    pickupDate: booking.pickupDate,
    pickupTime: booking.pickupTime,
    vehicleId: booking.vehicleId || null,
    driverId: booking.driverId || null,
    tripType: booking.tripType,
    passengers: booking.passengers,
    note: booking.note,
    tripPrice: booking.quotedPrice ?? 0,
    revenueAmount: booking.paidAmount ?? 0,
    status,
    byUserId: opts?.byUserId,
  });

  await trips.insertOne(trip);

  const bookings = await rideBookingsCol();
  await bookings.updateOne(
    { id: booking.id },
    { $set: { tripId: trip.id, updatedAt: new Date().toISOString() } },
  );

  return trip;
}

/**
 * Keep booking flow in sync: upsert a full trip when vehicle+driver are set
 * and booking has progressed past confirm. Does not invent thin stubs.
 */
export async function ensureTripFromBooking(
  booking: RideBooking,
): Promise<string | null> {
  if (
    booking.status === "PENDING" ||
    booking.status === "CANCELLED"
  ) {
    return booking.tripId ?? null;
  }

  const trips = await rideTripsCol();

  if (booking.tripId) {
    const existing = await trips.findOne({ id: booking.tripId });
    if (existing) {
      const mapped = bookingStatusToTripStatus(booking.status);
      const nextStatus =
        canTransitionTrip(existing.status, mapped) || existing.status === mapped
          ? mapped
          : existing.status;
      const patch: Record<string, unknown> = {
        vehicleId: booking.vehicleId || existing.vehicleId || null,
        driverId: booking.driverId || existing.driverId || null,
        pickupDate: booking.pickupDate,
        pickupTime: booking.pickupTime,
        customer: booking.customer,
        pickup: booking.pickup,
        destination: booking.destination,
        tripType: booking.tripType,
        passengers: booking.passengers,
        updatedAt: new Date().toISOString(),
      };
      if (booking.quotedPrice != null) {
        patch.tripPrice = booking.quotedPrice;
      }
      if (nextStatus !== existing.status) {
        patch.status = nextStatus;
        patch.statusHistory = pushStatusEvent(existing.statusHistory, nextStatus, {
          note: "Đồng bộ từ booking",
        });
      }
      await trips.updateOne({ id: existing.id }, { $set: patch });
      return existing.id;
    }
  }

  const created = await createTripFromBooking(booking);
  return created.id;
}

export async function hasTripVehicleConflict(params: {
  vehicleId: string;
  pickupDate: string;
  pickupTime?: string;
  returnDate?: string | null;
  returnTime?: string | null;
  plannedEndAt?: string | null;
  plannedDurationMinutes?: number | null;
  durationMinutes?: number | null;
  excludeTripId?: string;
}): Promise<boolean> {
  const { findTripVehicleConflict, tripWindow } = await import(
    "./ride-schedule.js"
  );
  const window = tripWindow(
    {
      pickupDate: params.pickupDate,
      pickupTime: params.pickupTime || "00:00",
      returnDate: params.returnDate,
      returnTime: params.returnTime,
      plannedEndAt: params.plannedEndAt,
      plannedDurationMinutes: params.plannedDurationMinutes,
    },
    params.durationMinutes,
  );
  const hit = await findTripVehicleConflict({
    vehicleId: params.vehicleId,
    window,
    excludeTripId: params.excludeTripId,
  });
  return Boolean(hit);
}

export async function hasTripDriverConflict(params: {
  driverId: string;
  pickupDate: string;
  pickupTime?: string;
  returnDate?: string | null;
  returnTime?: string | null;
  plannedEndAt?: string | null;
  plannedDurationMinutes?: number | null;
  durationMinutes?: number | null;
  excludeTripId?: string;
}): Promise<boolean> {
  const { findTripDriverConflict, tripWindow } = await import(
    "./ride-schedule.js"
  );
  const window = tripWindow(
    {
      pickupDate: params.pickupDate,
      pickupTime: params.pickupTime || "00:00",
      returnDate: params.returnDate,
      returnTime: params.returnTime,
      plannedEndAt: params.plannedEndAt,
      plannedDurationMinutes: params.plannedDurationMinutes,
    },
    params.durationMinutes,
  );
  const hit = await findTripDriverConflict({
    driverId: params.driverId,
    window,
    excludeTripId: params.excludeTripId,
  });
  return Boolean(hit);
}

export function isTripTerminal(status: TripStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

export function assertAssignReady(trip: RideTrip): string | null {
  if (!trip.vehicleId || !trip.driverId) {
    return "Cần đủ xe và tài xế trước khi chuyển sang Đã phân / Đang thực hiện";
  }
  return null;
}

const TRIP_STATUSES = new Set<TripStatus>([
  "DRAFT",
  "CONFIRMED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

const TRIP_TYPES = new Set<TripType>([
  "ONE_WAY",
  "ROUND_TRIP",
  "DAILY",
  "CUSTOM",
]);

/** Coerce thin/legacy trip stubs into the full RideTrip shape for API responses. */
export function normalizeTripDoc(raw: Partial<RideTrip> & { id: string }): RideTrip {
  const legacyStatus = String(raw.status ?? "DRAFT");
  let status: TripStatus = "DRAFT";
  if (TRIP_STATUSES.has(legacyStatus as TripStatus)) {
    status = legacyStatus as TripStatus;
  } else if (
    legacyStatus === "DRIVER_ASSIGNED" ||
    legacyStatus === "DRIVER_ARRIVING"
  ) {
    status = "ASSIGNED";
  } else if (legacyStatus === "PENDING") {
    status = "DRAFT";
  }

  const tripType = TRIP_TYPES.has(raw.tripType as TripType)
    ? (raw.tripType as TripType)
    : "ONE_WAY";

  const pickup: Place = {
    address: raw.pickup?.address?.trim() || "—",
    latitude: raw.pickup?.latitude ?? null,
    longitude: raw.pickup?.longitude ?? null,
  };
  const destination: Place = {
    address: raw.destination?.address?.trim() || "—",
    latitude: raw.destination?.latitude ?? null,
    longitude: raw.destination?.longitude ?? null,
  };

  const now = new Date().toISOString();
  const history = Array.isArray(raw.statusHistory) ? raw.statusHistory : [];

  return {
    _id: raw._id,
    id: raw.id,
    tripCode: raw.tripCode?.trim() || `LEGACY-${raw.id.slice(0, 8)}`,
    bookingId: raw.bookingId ?? null,
    bookingCode: raw.bookingCode ?? null,
    customerId: raw.customerId ?? null,
    customer: {
      name: raw.customer?.name?.trim() || "—",
      phone: raw.customer?.phone?.trim() || "—",
    },
    pickup,
    destination,
    routeLabel:
      raw.routeLabel?.trim() || `${pickup.address} → ${destination.address}`,
    pickupDate: raw.pickupDate || "",
    pickupTime: raw.pickupTime || "",
    returnDate: raw.returnDate ?? null,
    returnTime: raw.returnTime ?? null,
    vehicleId: raw.vehicleId || null,
    driverId: raw.driverId || null,
    tripType,
    passengers: Math.max(1, Number(raw.passengers) || 1),
    note: raw.note,
    tripPrice: Number(raw.tripPrice) || 0,
    expenseTotal: Number(raw.expenseTotal) || 0,
    revenueAmount: Number(raw.revenueAmount) || 0,
    plannedEndAt: raw.plannedEndAt ?? null,
    plannedDurationMinutes: raw.plannedDurationMinutes ?? null,
    actualCosts: raw.actualCosts ?? null,
    startOdometer: raw.startOdometer ?? null,
    endOdometer: raw.endOdometer ?? null,
    status,
    statusHistory:
      history.length > 0
        ? history
        : [{ status, at: raw.createdAt || now, note: "Legacy record" }],
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };
}

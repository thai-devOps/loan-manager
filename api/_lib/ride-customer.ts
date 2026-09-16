import { randomUUID } from "node:crypto";
import type {
  RideCustomer,
  RideCustomerStatus,
} from "./ride-types.js";
import {
  rideBookingsCol,
  rideCustomersCol,
  rideTripsCol,
  stripDoc,
} from "./mongo.js";
import { normalizeTripDoc } from "./ride-trip.js";

export function normalizeCustomerPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function generateCustomerCode(): Promise<string> {
  const col = await rideCustomersCol();
  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  for (let i = 0; i < 40; i++) {
    const suffix = String(1000 + Math.floor(Math.random() * 9000));
    const code = `KH-${day}-${suffix}`;
    const exists = await col.findOne(
      { customerCode: code },
      { projection: { id: 1 } },
    );
    if (!exists) return code;
  }
  return `KH-${day}-${Date.now().toString().slice(-4)}`;
}

export async function phoneTaken(
  phone: string,
  excludeId?: string,
): Promise<boolean> {
  const col = await rideCustomersCol();
  const filter: Record<string, unknown> = { phone };
  if (excludeId) filter.id = { $ne: excludeId };
  return Boolean(await col.findOne(filter, { projection: { id: 1 } }));
}

export function normalizeCustomerDoc(
  raw: Partial<RideCustomer> & { id: string },
): RideCustomer {
  const now = new Date().toISOString();
  const status: RideCustomerStatus =
    raw.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  return {
    _id: raw._id,
    id: raw.id,
    customerCode: raw.customerCode?.trim() || `LEGACY-${raw.id.slice(0, 8)}`,
    name: raw.name?.trim() || "—",
    phone: normalizeCustomerPhone(raw.phone ?? "") || raw.phone || "—",
    email: raw.email?.trim() || undefined,
    address: raw.address?.trim() || undefined,
    note: raw.note?.trim() || undefined,
    status,
    tripCount: Number(raw.tripCount) || 0,
    totalSpend: Number(raw.totalSpend) || 0,
    lastBookingAt: raw.lastBookingAt,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };
}

/** Upsert by normalized phone — used by public booking create. */
export async function upsertCustomer(params: {
  name: string;
  phone: string;
}): Promise<string> {
  const col = await rideCustomersCol();
  const phone = normalizeCustomerPhone(params.phone);
  const existing = await col.findOne({ phone });
  const now = new Date().toISOString();
  if (existing) {
    await col.updateOne(
      { id: existing.id },
      {
        $set: {
          name: params.name.trim() || existing.name,
          updatedAt: now,
          lastBookingAt: now,
          status: existing.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        },
        $inc: { tripCount: 1 },
      },
    );
    return existing.id;
  }

  const id = randomUUID();
  const customerCode = await generateCustomerCode();
  const row: RideCustomer = {
    _id: id,
    id,
    customerCode,
    name: params.name.trim(),
    phone,
    status: "ACTIVE",
    tripCount: 1,
    totalSpend: 0,
    lastBookingAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(row);
  return id;
}

export async function refreshCustomerStats(customerId: string): Promise<void> {
  const customers = await rideCustomersCol();
  const bookings = await rideBookingsCol();
  const trips = await rideTripsCol();

  const customer = await customers.findOne({ id: customerId });
  if (!customer) return;

  const bookingRows = await bookings.find({ customerId }).toArray();
  const tripRows = await trips.find({ customerId }).toArray();

  const completedTrips = tripRows.filter((t) => t.status === "COMPLETED");
  const tripRevenue = completedTrips.reduce(
    (sum, t) => sum + (Number(t.revenueAmount) || Number(t.tripPrice) || 0),
    0,
  );
  const bookingPaid = bookingRows.reduce(
    (sum, b) => sum + (Number(b.paidAmount) || 0),
    0,
  );
  const totalSpend = Math.max(tripRevenue, bookingPaid);
  const tripCount = Math.max(tripRows.length, bookingRows.length);

  const lastDates = [
    ...bookingRows.map((b) => b.pickupDate || b.createdAt),
    ...tripRows.map((t) => t.pickupDate || t.createdAt),
  ].filter(Boolean);
  lastDates.sort();
  const lastBookingAt = lastDates.at(-1);

  await customers.updateOne(
    { id: customerId },
    {
      $set: {
        tripCount,
        totalSpend,
        ...(lastBookingAt ? { lastBookingAt } : {}),
        updatedAt: new Date().toISOString(),
      },
    },
  );
}

export async function getCustomerDetail(customerId: string) {
  const customers = await rideCustomersCol();
  const bookings = await rideBookingsCol();
  const trips = await rideTripsCol();

  const raw = await customers.findOne({ id: customerId });
  if (!raw) return null;
  const customer = normalizeCustomerDoc(raw);

  const bookingRows = await bookings
    .find({ customerId })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  let tripRows = await trips
    .find({ customerId })
    .sort({ pickupDate: -1, pickupTime: -1 })
    .limit(20)
    .toArray();

  if (tripRows.length === 0 && customer.phone && customer.phone !== "—") {
    tripRows = await trips
      .find({ "customer.phone": customer.phone })
      .sort({ pickupDate: -1, pickupTime: -1 })
      .limit(20)
      .toArray();
  }

  const completedTrips = tripRows.filter((t) => {
    const n = normalizeTripDoc(t);
    return n.status === "COMPLETED";
  });
  const totalRevenue = completedTrips.reduce((sum, t) => {
    const n = normalizeTripDoc(t);
    return sum + (n.revenueAmount || n.tripPrice || 0);
  }, 0);

  return {
    ...stripDoc(customer),
    stats: {
      tripCount: tripRows.length,
      completedTrips: completedTrips.length,
      totalRevenue:
        totalRevenue ||
        bookingRows.reduce((s, b) => s + (Number(b.paidAmount) || 0), 0),
      bookingCount: bookingRows.length,
    },
    recentTrips: tripRows.map((t) => stripDoc(normalizeTripDoc(t))),
    recentBookings: bookingRows.map((b) => stripDoc(b)),
  };
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../_lib/http.js";
import {
  generateBookingCode,
  normalizePhone,
} from "../../_lib/ride-booking.js";
import type {
  RideBooking,
  RideCustomer,
  ServiceType,
  TripType,
} from "../../_lib/ride-types.js";
import {
  rideBookingsCol,
  rideCustomersCol,
  rideVehiclesCol,
  stripDoc,
} from "../../_lib/mongo.js";

const SERVICE_TYPES = new Set([
  "TRAVEL",
  "MEDICAL",
  "PILGRIMAGE",
  "AIRPORT",
  "BUSINESS",
  "CUSTOM",
]);
const TRIP_TYPES = new Set(["ONE_WAY", "ROUND_TRIP", "DAILY", "CUSTOM"]);

async function upsertCustomer(params: {
  name: string;
  phone: string;
}): Promise<string> {
  const col = await rideCustomersCol();
  const phone = normalizePhone(params.phone);
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
        },
        $inc: { tripCount: 1 },
      },
    );
    return existing.id;
  }
  const id = randomUUID();
  const row: RideCustomer = {
    _id: id,
    id,
    name: params.name.trim(),
    phone,
    tripCount: 1,
    totalSpend: 0,
    lastBookingAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(row);
  return id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const col = await rideBookingsCol();

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_BOOKING_VIEW))) return;
      const status = typeof req.query.status === "string" ? req.query.status : "";
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const date = typeof req.query.date === "string" ? req.query.date : "";
      const serviceType =
        typeof req.query.serviceType === "string" ? req.query.serviceType : "";
      const vehicleId =
        typeof req.query.vehicleId === "string" ? req.query.vehicleId : "";
      const driverId =
        typeof req.query.driverId === "string" ? req.query.driverId : "";

      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      if (date) filter.pickupDate = date;
      if (serviceType) filter.serviceType = serviceType;
      if (vehicleId) filter.vehicleId = vehicleId;
      if (driverId) filter.driverId = driverId;
      if (q) {
        const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        filter.$or = [
          { bookingCode: rx },
          { "customer.name": rx },
          { "customer.phone": rx },
          { "destination.address": rx },
          { "pickup.address": rx },
        ];
      }

      const rows = await col
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();
      res.status(200).json(rows.map((r) => stripDoc(r)));
      return;
    }

    if (req.method === "POST") {
      // Public create — customer website (no auth)
      const body = readJsonBody<{
        serviceType?: string;
        pickup?: { address?: string };
        destination?: { address?: string };
        pickupDate?: string;
        pickupTime?: string;
        tripType?: string;
        passengers?: number;
        vehicleId?: string;
        customer?: { name?: string; phone?: string };
        note?: string;
      }>(req);

      const serviceType = (body.serviceType ?? "").trim();
      const tripType = (body.tripType ?? "ONE_WAY").trim();
      const pickupAddress = (body.pickup?.address ?? "").trim();
      const destAddress = (body.destination?.address ?? "").trim();
      const pickupDate = (body.pickupDate ?? "").trim();
      const pickupTime = (body.pickupTime ?? "").trim();
      const vehicleId = (body.vehicleId ?? "").trim();
      const customerName = (body.customer?.name ?? "").trim();
      const customerPhone = (body.customer?.phone ?? "").trim();
      const passengers = Number(body.passengers);

      if (!SERVICE_TYPES.has(serviceType)) {
        res.status(400).json({ error: "Loại dịch vụ không hợp lệ" });
        return;
      }
      if (!TRIP_TYPES.has(tripType)) {
        res.status(400).json({ error: "Hình thức chuyến không hợp lệ" });
        return;
      }
      if (!pickupAddress || !destAddress) {
        res.status(400).json({ error: "Vui lòng nhập điểm đón và điểm đến" });
        return;
      }
      if (!pickupDate || !pickupTime) {
        res.status(400).json({ error: "Vui lòng chọn ngày và giờ đón" });
        return;
      }
      if (!Number.isFinite(passengers) || passengers < 1) {
        res.status(400).json({ error: "Số khách không hợp lệ" });
        return;
      }
      if (!vehicleId) {
        res.status(400).json({ error: "Vui lòng chọn xe" });
        return;
      }
      if (!customerName || normalizePhone(customerPhone).length < 9) {
        res.status(400).json({ error: "Thông tin liên hệ không hợp lệ" });
        return;
      }

      const vehicles = await rideVehiclesCol();
      const vehicle = await vehicles.findOne({ id: vehicleId, active: true });
      if (!vehicle) {
        res.status(400).json({ error: "Xe không còn khả dụng" });
        return;
      }
      if (vehicle.seats < passengers) {
        res.status(400).json({ error: "Số khách vượt quá số chỗ của xe" });
        return;
      }

      const customerId = await upsertCustomer({
        name: customerName,
        phone: customerPhone,
      });
      const now = new Date().toISOString();
      const id = randomUUID();
      const bookingCode = await generateBookingCode();

      const booking: RideBooking = {
        _id: id,
        id,
        bookingCode,
        serviceType: serviceType as ServiceType,
        pickup: { address: pickupAddress },
        destination: { address: destAddress },
        pickupDate,
        pickupTime,
        tripType: tripType as TripType,
        passengers,
        vehicleId,
        driverId: null,
        customerId,
        customer: {
          name: customerName,
          phone: customerPhone.trim(),
        },
        note: body.note?.trim() || undefined,
        quotedPrice: null,
        deposit: 0,
        paidAmount: 0,
        status: "PENDING",
        driver: null,
        tripId: null,
        createdAt: now,
        updatedAt: now,
      };

      await col.insertOne(booking);
      res.status(201).json(stripDoc(booking));
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

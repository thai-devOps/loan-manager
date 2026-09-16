import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import { upsertCustomer } from "../../../_lib/ride-customer.js";
import {
  buildTripDocument,
  createTripFromBooking,
  normalizeTripDoc,
} from "../../../_lib/ride-trip.js";
import type { TripStatus, TripType } from "../../../_lib/ride-types.js";
import {
  rideBookingsCol,
  rideTripsCol,
  stripDoc,
} from "../../../_lib/mongo.js";

const TRIP_TYPES = new Set(["ONE_WAY", "ROUND_TRIP", "DAILY", "CUSTOM"]);
const TRIP_STATUSES = new Set([
  "DRAFT",
  "CONFIRMED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

type CreateBody = {
  bookingId?: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string | null;
  pickupAddress?: string;
  destinationAddress?: string;
  routeLabel?: string;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string | null;
  returnTime?: string | null;
  vehicleId?: string | null;
  driverId?: string | null;
  tripType?: TripType;
  passengers?: number;
  note?: string;
  tripPrice?: number;
  expenseTotal?: number;
  revenueAmount?: number;
  status?: TripStatus;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const col = await rideTripsCol();

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_VIEW))) return;

      const status = typeof req.query.status === "string" ? req.query.status : "";
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const date = typeof req.query.date === "string" ? req.query.date : "";
      const from = typeof req.query.from === "string" ? req.query.from : "";
      const to = typeof req.query.to === "string" ? req.query.to : "";
      const vehicleId =
        typeof req.query.vehicleId === "string" ? req.query.vehicleId : "";
      const driverId =
        typeof req.query.driverId === "string" ? req.query.driverId : "";
      const tripType =
        typeof req.query.tripType === "string" ? req.query.tripType : "";

      const filter: Record<string, unknown> = {};
      if (status && TRIP_STATUSES.has(status)) filter.status = status;
      if (date) filter.pickupDate = date;
      if (from || to) {
        filter.pickupDate = {
          ...(from ? { $gte: from } : {}),
          ...(to ? { $lte: to } : {}),
        };
      }
      if (vehicleId) filter.vehicleId = vehicleId;
      if (driverId) filter.driverId = driverId;
      if (tripType && TRIP_TYPES.has(tripType)) filter.tripType = tripType;
      if (q) {
        const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        filter.$or = [
          { tripCode: rx },
          { bookingCode: rx },
          { "customer.name": rx },
          { "customer.phone": rx },
          { "pickup.address": rx },
          { "destination.address": rx },
          { routeLabel: rx },
        ];
      }

      const rows = await col.find(filter).sort({ pickupDate: -1, pickupTime: -1 }).toArray();
      res.status(200).json(rows.map((r) => stripDoc(normalizeTripDoc(r))));
      return;
    }

    if (req.method === "POST") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_CREATE))) return;
      const body = readJsonBody<CreateBody>(req);

      if (body.bookingId) {
        const bookings = await rideBookingsCol();
        const booking = await bookings.findOne({ id: body.bookingId });
        if (!booking) {
          res.status(404).json({ error: "Không tìm thấy booking" });
          return;
        }
        if (booking.status === "PENDING" || booking.status === "CANCELLED") {
          res.status(400).json({
            error: "Chỉ tạo chuyến từ booking đã xác nhận (hoặc đang vận hành)",
          });
          return;
        }
        if (booking.tripId) {
          const existing = await col.findOne({ id: booking.tripId });
          if (existing) {
            res.status(200).json(stripDoc(existing));
            return;
          }
        }
        if (!booking.customerId && booking.customer?.phone) {
          const customerId = await upsertCustomer({
            name: booking.customer.name || "Khách",
            phone: booking.customer.phone,
          });
          await bookings.updateOne(
            { id: booking.id },
            { $set: { customerId, updatedAt: new Date().toISOString() } },
          );
          booking.customerId = customerId;
        }
        const trip = await createTripFromBooking(booking);
        res.status(201).json(stripDoc(normalizeTripDoc(trip)));
        return;
      }

      const tripType = body.tripType;
      if (!tripType || !TRIP_TYPES.has(tripType)) {
        res.status(400).json({ error: "Loại chuyến không hợp lệ" });
        return;
      }
      const pickupAddress = (body.pickupAddress ?? "").trim();
      const destinationAddress = (body.destinationAddress ?? "").trim();
      const pickupDate = (body.pickupDate ?? "").trim();
      const pickupTime = (body.pickupTime ?? "").trim();
      const customerName = (body.customerName ?? "").trim();
      const customerPhone = (body.customerPhone ?? "").trim();
      if (!pickupAddress || !destinationAddress) {
        res.status(400).json({ error: "Cần điểm đón và điểm trả" });
        return;
      }
      if (!pickupDate || !pickupTime) {
        res.status(400).json({ error: "Cần ngày giờ đón" });
        return;
      }
      if (!customerName || !customerPhone) {
        res.status(400).json({ error: "Cần tên và SĐT khách" });
        return;
      }
      if (tripType === "ROUND_TRIP" && !(body.returnDate ?? "").trim()) {
        res.status(400).json({ error: "Khứ hồi cần ngày về" });
        return;
      }

      let status: TripStatus = body.status ?? "DRAFT";
      if (!TRIP_STATUSES.has(status)) status = "DRAFT";
      if (
        (status === "ASSIGNED" ||
          status === "IN_PROGRESS" ||
          status === "COMPLETED") &&
        (!(body.vehicleId ?? "").trim() || !(body.driverId ?? "").trim())
      ) {
        status = "DRAFT";
      }

      const customerId =
        body.customerId?.trim() ||
        (await upsertCustomer({ name: customerName, phone: customerPhone }));

      const trip = await buildTripDocument({
        customerId,
        customer: { name: customerName, phone: customerPhone },
        pickup: { address: pickupAddress },
        destination: { address: destinationAddress },
        routeLabel: body.routeLabel,
        pickupDate,
        pickupTime,
        returnDate: body.returnDate ?? null,
        returnTime: body.returnTime ?? null,
        vehicleId: body.vehicleId || null,
        driverId: body.driverId || null,
        tripType,
        passengers: body.passengers ?? 1,
        note: body.note,
        tripPrice: body.tripPrice ?? 0,
        expenseTotal: body.expenseTotal ?? 0,
        revenueAmount: body.revenueAmount ?? 0,
        status,
      });
      await col.insertOne(trip);
      res.status(201).json(stripDoc(normalizeTripDoc(trip)));
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

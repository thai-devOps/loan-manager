import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import {
  bookingWindow,
  listAvailability,
  parseDateTimeMs,
  tripWindow,
} from "../../_lib/ride-schedule.js";
import { rideBookingsCol, rideTripsCol } from "../../_lib/mongo.js";
import { normalizeTripDoc } from "../../_lib/ride-trip.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_VIEW))) {
      return;
    }
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const tripId =
      typeof req.query.tripId === "string" ? req.query.tripId : undefined;
    const bookingId =
      typeof req.query.bookingId === "string" ? req.query.bookingId : undefined;
    const pickupDate =
      typeof req.query.pickupDate === "string" ? req.query.pickupDate : "";
    const pickupTime =
      typeof req.query.pickupTime === "string" ? req.query.pickupTime : "00:00";
    const returnDate =
      typeof req.query.returnDate === "string" ? req.query.returnDate : null;
    const returnTime =
      typeof req.query.returnTime === "string" ? req.query.returnTime : null;
    const durationMinutes =
      typeof req.query.durationMinutes === "string"
        ? Number(req.query.durationMinutes)
        : null;

    let window: { startMs: number; endMs: number };

    if (tripId) {
      const trips = await rideTripsCol();
      const raw = await trips.findOne({ id: tripId });
      if (!raw) {
        res.status(404).json({ error: "Không tìm thấy chuyến" });
        return;
      }
      const trip = normalizeTripDoc(raw);
      window = tripWindow(trip);
    } else if (bookingId) {
      const bookings = await rideBookingsCol();
      const booking = await bookings.findOne({ id: bookingId });
      if (!booking) {
        res.status(404).json({ error: "Không tìm thấy booking" });
        return;
      }
      window = bookingWindow(booking);
    } else if (pickupDate) {
      const startMs = parseDateTimeMs(pickupDate, pickupTime);
      let endMs: number;
      if (returnDate && returnTime) {
        endMs = parseDateTimeMs(returnDate, returnTime);
      } else {
        const mins =
          durationMinutes && Number.isFinite(durationMinutes)
            ? Math.max(30, durationMinutes)
            : 180;
        endMs = startMs + mins * 60_000;
      }
      window = { startMs, endMs };
    } else {
      res.status(400).json({
        error: "Cần tripId, bookingId hoặc pickupDate",
      });
      return;
    }

    if (!(window.endMs > window.startMs)) {
      res.status(400).json({ error: "Khung giờ không hợp lệ" });
      return;
    }

    const result = await listAvailability({
      startMs: window.startMs,
      endMs: window.endMs,
      excludeTripId: tripId,
      excludeBookingId: bookingId,
    });

    res.status(200).json({
      startMs: window.startMs,
      endMs: window.endMs,
      vehicles: result.vehicles.map((row) => ({
        id: row.vehicle.id,
        name: row.vehicle.name,
        licensePlate: row.vehicle.licensePlate,
        seats: row.vehicle.seats,
        available: row.available,
        conflictLabel: row.conflictLabel,
      })),
      drivers: result.drivers.map((row) => ({
        id: row.driver.id,
        name: row.driver.name,
        phone: row.driver.phone,
        status: row.driver.status,
        available: row.available,
        conflictLabel: row.conflictLabel,
      })),
    });
  });
}

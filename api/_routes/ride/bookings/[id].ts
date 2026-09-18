import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  buildDriverSnapshot,
  canTransition,
  ensureTripStub,
  hasDriverConflict,
  hasVehicleConflict,
} from "../../../_lib/ride-booking.js";
import type { BookingQuoteSnapshot, BookingStatus } from "../../../_lib/ride-types.js";
import {
  rideBookingsCol,
  rideDriversCol,
  rideTripsCol,
  rideVehiclesCol,
  stripDoc,
} from "../../../_lib/mongo.js";

type ActionBody = {
  action?: string;
  vehicleId?: string;
  driverId?: string;
  quotedPrice?: number | null;
  quoteSnapshot?: BookingQuoteSnapshot | null;
  pricingSnapshot?: import("../../../_lib/ride-types.js").BookingPricingSnapshot | null;
  deposit?: number;
  paidAmount?: number;
  status?: BookingStatus;
  note?: string;
  /** When true, server ignores client quotedPrice and requires pricingSnapshot from engine. */
  fromEngine?: boolean;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_BOOKING_VIEW))) {
        return;
      }
      const col = await rideBookingsCol();
      const row = await col.findOne({ id });
      if (!row) {
        res.status(404).json({ error: "Không tìm thấy booking" });
        return;
      }
      res.status(200).json(stripDoc(row));
      return;
    }

    if (req.method === "DELETE") {
      if (
        !(await requirePermission(req, res, PERMISSIONS.FLEET_BOOKING_DELETE))
      ) {
        return;
      }
      const col = await rideBookingsCol();
      const booking = await col.findOne({ id });
      if (!booking) {
        res.status(404).json({ error: "Không tìm thấy booking" });
        return;
      }
      if (booking.tripId) {
        const trips = await rideTripsCol();
        await trips.updateOne(
          { id: booking.tripId },
          {
            $set: {
              bookingId: null,
              bookingCode: null,
              updatedAt: new Date().toISOString(),
            },
          },
        );
      }
      await col.deleteOne({ id });
      res.status(204).end();
      return;
    }

    if (req.method === "PATCH") {
      if (
        !(await requirePermission(req, res, PERMISSIONS.FLEET_BOOKING_UPDATE))
      ) {
        return;
      }
      const col = await rideBookingsCol();
      const body = readJsonBody<ActionBody>(req);
      const booking = await col.findOne({ id });
      if (!booking) {
        res.status(404).json({ error: "Không tìm thấy booking" });
        return;
      }

      const now = new Date().toISOString();
      const action = (body.action ?? "").trim();

      if (action === "confirm") {
        if (!canTransition(booking.status, "CONFIRMED")) {
          res.status(400).json({ error: "Không thể xác nhận từ trạng thái hiện tại" });
          return;
        }
        const result = await col.findOneAndUpdate(
          { id },
          { $set: { status: "CONFIRMED", updatedAt: now } },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(result!));
        return;
      }

      if (action === "cancel") {
        if (!canTransition(booking.status, "CANCELLED")) {
          res.status(400).json({ error: "Không thể hủy booking này" });
          return;
        }
        const result = await col.findOneAndUpdate(
          { id },
          { $set: { status: "CANCELLED", updatedAt: now } },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(result!));
        return;
      }

      if (action === "quote") {
        const pricingSnapshot = body.pricingSnapshot ?? null;
        let quotedPrice =
          body.quotedPrice === null || body.quotedPrice === undefined
            ? null
            : Number(body.quotedPrice);

        // Prefer engine snapshot total when provided (prevents payload tampering)
        if (pricingSnapshot && Number.isFinite(Number(pricingSnapshot.total))) {
          quotedPrice = Number(pricingSnapshot.total);
        }

        if (quotedPrice !== null && (!Number.isFinite(quotedPrice) || quotedPrice < 0)) {
          res.status(400).json({ error: "Giá báo không hợp lệ" });
          return;
        }

        if (
          pricingSnapshot &&
          quotedPrice != null &&
          Math.abs(Number(pricingSnapshot.total) - quotedPrice) > 1
        ) {
          res.status(400).json({
            error: "Giá báo không khớp bảng giá hệ thống",
            code: "PRICE_MISMATCH",
          });
          return;
        }

        const deposit = Number(body.deposit ?? booking.deposit ?? 0);
        const paidAmount = Number(body.paidAmount ?? booking.paidAmount ?? 0);
        const patch: Record<string, unknown> = {
          quotedPrice,
          deposit: Number.isFinite(deposit) ? deposit : 0,
          paidAmount: Number.isFinite(paidAmount) ? paidAmount : 0,
          updatedAt: now,
        };
        if (body.quoteSnapshot !== undefined) {
          patch.quoteSnapshot = body.quoteSnapshot;
        }
        if (body.pricingSnapshot !== undefined) {
          patch.pricingSnapshot = body.pricingSnapshot;
        }
        const result = await col.findOneAndUpdate(
          { id },
          { $set: patch },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(result!));
        return;
      }

      if (action === "assignVehicle") {
        const vehicleId = (body.vehicleId ?? "").trim();
        if (!vehicleId) {
          res.status(400).json({ error: "Vui lòng chọn xe" });
          return;
        }
        const vehicles = await rideVehiclesCol();
        const vehicle = await vehicles.findOne({ id: vehicleId, active: true });
        if (!vehicle) {
          res.status(400).json({ error: "Xe không khả dụng" });
          return;
        }
        if (
          await hasVehicleConflict({
            vehicleId,
            pickupDate: booking.pickupDate,
            pickupTime: booking.pickupTime,
            durationMinutes: booking.quoteSnapshot?.durationMinutes,
            excludeBookingId: id,
          })
        ) {
          res.status(409).json({
            error: "Xe đã có chuyến trong khoảng thời gian này.",
          });
          return;
        }

        let nextStatus = booking.status;
        let driverSnap = booking.driver ?? null;
        if (booking.driverId && booking.status === "CONFIRMED") {
          nextStatus = "DRIVER_ASSIGNED";
          driverSnap = await buildDriverSnapshot(booking.driverId, vehicleId);
        }

        let updated = await col.findOneAndUpdate(
          { id },
          {
            $set: {
              vehicleId,
              status: nextStatus,
              driver: driverSnap,
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );
        if (updated) {
          const tripId = await ensureTripStub(updated);
          if (tripId && tripId !== updated.tripId) {
            updated = await col.findOneAndUpdate(
              { id },
              { $set: { tripId, updatedAt: now } },
              { returnDocument: "after" },
            );
          }
        }
        res.status(200).json(stripDoc(updated!));
        return;
      }

      if (action === "assignDriver") {
        const driverId = (body.driverId ?? "").trim();
        if (!driverId) {
          res.status(400).json({ error: "Vui lòng chọn tài xế" });
          return;
        }
        if (booking.status === "PENDING") {
          res.status(400).json({ error: "Cần xác nhận booking trước khi phân tài xế" });
          return;
        }
        const drivers = await rideDriversCol();
        const driver = await drivers.findOne({ id: driverId, active: true });
        if (!driver) {
          res.status(400).json({ error: "Tài xế không khả dụng" });
          return;
        }
        if (
          await hasDriverConflict({
            driverId,
            pickupDate: booking.pickupDate,
            pickupTime: booking.pickupTime,
            durationMinutes: booking.quoteSnapshot?.durationMinutes,
            excludeBookingId: id,
          })
        ) {
          res.status(409).json({
            error: "Tài xế đã có chuyến trong khoảng thời gian này.",
          });
          return;
        }

        const vehicleId = booking.vehicleId;
        if (!vehicleId) {
          res.status(400).json({ error: "Cần chọn xe trước khi phân tài xế" });
          return;
        }

        const driverSnap = await buildDriverSnapshot(driverId, vehicleId);
        let nextStatus: BookingStatus = booking.status;
        if (
          booking.status === "CONFIRMED" ||
          booking.status === "DRIVER_ASSIGNED"
        ) {
          nextStatus = "DRIVER_ASSIGNED";
        }

        let updated = await col.findOneAndUpdate(
          { id },
          {
            $set: {
              driverId,
              driver: driverSnap,
              status: nextStatus,
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );
        if (updated) {
          const tripId = await ensureTripStub(updated);
          if (tripId && tripId !== updated.tripId) {
            updated = await col.findOneAndUpdate(
              { id },
              { $set: { tripId, updatedAt: now } },
              { returnDocument: "after" },
            );
          }
        }
        res.status(200).json(stripDoc(updated!));
        return;
      }

      if (action === "setStatus") {
        const status = body.status;
        if (!status || !canTransition(booking.status, status)) {
          res.status(400).json({ error: "Chuyển trạng thái không hợp lệ" });
          return;
        }
        if (status === "DRIVER_ASSIGNED" && (!booking.vehicleId || !booking.driverId)) {
          res.status(400).json({ error: "Cần đủ xe và tài xế trước" });
          return;
        }
        let updated = await col.findOneAndUpdate(
          { id },
          { $set: { status, updatedAt: now } },
          { returnDocument: "after" },
        );
        if (updated) {
          const tripId = await ensureTripStub(updated);
          if (tripId && tripId !== updated.tripId) {
            updated = await col.findOneAndUpdate(
              { id },
              { $set: { tripId, updatedAt: now } },
              { returnDocument: "after" },
            );
          }
        }
        res.status(200).json(stripDoc(updated!));
        return;
      }

      // Generic field update (note)
      if (body.note !== undefined) {
        const result = await col.findOneAndUpdate(
          { id },
          { $set: { note: body.note.trim(), updatedAt: now } },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(result!));
        return;
      }

      res.status(400).json({ error: "Action không hợp lệ" });
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
  });
}

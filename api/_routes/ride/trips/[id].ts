import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  assertAssignReady,
  canTransitionTrip,
  hasTripDriverConflict,
  hasTripVehicleConflict,
  isTripTerminal,
  normalizeTripDoc,
  pushStatusEvent,
} from "../../../_lib/ride-trip.js";
import type { TripStatus, TripType } from "../../../_lib/ride-types.js";
import {
  rideDriversCol,
  rideTripsCol,
  rideVehiclesCol,
  stripDoc,
} from "../../../_lib/mongo.js";

const TRIP_TYPES = new Set(["ONE_WAY", "ROUND_TRIP", "DAILY", "CUSTOM"]);

type ActionBody = {
  action?: string;
  status?: TripStatus;
  note?: string;
  vehicleId?: string | null;
  driverId?: string | null;
  customerName?: string;
  customerPhone?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  routeLabel?: string;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string | null;
  returnTime?: string | null;
  tripType?: TripType;
  passengers?: number;
  tripPrice?: number;
  expenseTotal?: number;
  revenueAmount?: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const col = await rideTripsCol();

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_VIEW))) return;
      const row = await col.findOne({ id });
      if (!row) {
        res.status(404).json({ error: "Không tìm thấy chuyến xe" });
        return;
      }
      res.status(200).json(stripDoc(normalizeTripDoc(row)));
      return;
    }

    if (req.method === "PATCH") {
      const body = readJsonBody<ActionBody>(req);
      const trip = await col.findOne({ id });
      if (!trip) {
        res.status(404).json({ error: "Không tìm thấy chuyến xe" });
        return;
      }
      const current = normalizeTripDoc(trip);

      const now = new Date().toISOString();
      const action = (body.action ?? "").trim();

      if (action === "cancel") {
        if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_UPDATE))) return;
        if (!canTransitionTrip(current.status, "CANCELLED")) {
          res.status(400).json({ error: "Không thể hủy chuyến ở trạng thái hiện tại" });
          return;
        }
        const result = await col.findOneAndUpdate(
          { id },
          {
            $set: {
              status: "CANCELLED",
              statusHistory: pushStatusEvent(current.statusHistory, "CANCELLED", {
                note: body.note,
              }),
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(normalizeTripDoc(result!)));
        return;
      }

      if (action === "setStatus") {
        const status = body.status;
        if (!status || !canTransitionTrip(current.status, status)) {
          res.status(400).json({ error: "Chuyển trạng thái không hợp lệ" });
          return;
        }
        const needComplete =
          status === "COMPLETED"
            ? PERMISSIONS.FLEET_TRIP_COMPLETE
            : PERMISSIONS.FLEET_TRIP_UPDATE;
        if (!(await requirePermission(req, res, needComplete))) return;

        if (status === "ASSIGNED" || status === "IN_PROGRESS") {
          const err = assertAssignReady({
            ...current,
            vehicleId: body.vehicleId !== undefined ? body.vehicleId : current.vehicleId,
            driverId: body.driverId !== undefined ? body.driverId : current.driverId,
          });
          if (err) {
            res.status(400).json({ error: err });
            return;
          }
        }

        const result = await col.findOneAndUpdate(
          { id },
          {
            $set: {
              status,
              statusHistory: pushStatusEvent(current.statusHistory, status, {
                note: body.note,
              }),
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(normalizeTripDoc(result!)));
        return;
      }

      if (action === "assign") {
        if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_UPDATE))) return;
        if (isTripTerminal(current.status)) {
          res.status(400).json({ error: "Không thể phân xe/tài xế cho chuyến đã kết thúc" });
          return;
        }
        const vehicleId = (body.vehicleId ?? current.vehicleId ?? "").trim();
        const driverId = (body.driverId ?? current.driverId ?? "").trim();
        if (!vehicleId || !driverId) {
          res.status(400).json({ error: "Cần chọn đủ xe và tài xế" });
          return;
        }
        const vehicles = await rideVehiclesCol();
        const drivers = await rideDriversCol();
        const vehicle = await vehicles.findOne({ id: vehicleId, active: true });
        const driver = await drivers.findOne({ id: driverId, active: true });
        if (!vehicle) {
          res.status(400).json({ error: "Xe không khả dụng" });
          return;
        }
        if (!driver) {
          res.status(400).json({ error: "Tài xế không khả dụng" });
          return;
        }
        if (
          await hasTripVehicleConflict({
            vehicleId,
            pickupDate: current.pickupDate,
            excludeTripId: id,
          })
        ) {
          res.status(400).json({ error: "Xe đã có chuyến trong ngày này" });
          return;
        }
        if (
          await hasTripDriverConflict({
            driverId,
            pickupDate: current.pickupDate,
            excludeTripId: id,
          })
        ) {
          res.status(400).json({ error: "Tài xế đã có chuyến trong ngày này" });
          return;
        }

        let nextStatus = current.status;
        let history = current.statusHistory;
        if (current.status === "DRAFT" || current.status === "CONFIRMED") {
          if (canTransitionTrip(current.status, "ASSIGNED")) {
            nextStatus = "ASSIGNED";
            history = pushStatusEvent(history, "ASSIGNED", {
              note: "Phân xe và tài xế",
            });
          }
        }

        const result = await col.findOneAndUpdate(
          { id },
          {
            $set: {
              vehicleId,
              driverId,
              status: nextStatus,
              statusHistory: history,
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(normalizeTripDoc(result!)));
        return;
      }

      // Field update
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_UPDATE))) return;
      if (isTripTerminal(current.status)) {
        res.status(400).json({ error: "Không thể sửa chuyến đã hoàn thành/hủy" });
        return;
      }

      const patch: Record<string, unknown> = { updatedAt: now };
      if (body.customerName !== undefined || body.customerPhone !== undefined) {
        patch.customer = {
          name: (body.customerName ?? current.customer.name).trim(),
          phone: (body.customerPhone ?? current.customer.phone).trim(),
        };
      }
      if (body.pickupAddress !== undefined) {
        patch.pickup = {
          ...current.pickup,
          address: body.pickupAddress.trim(),
        };
      }
      if (body.destinationAddress !== undefined) {
        patch.destination = {
          ...current.destination,
          address: body.destinationAddress.trim(),
        };
      }
      if (body.routeLabel !== undefined) patch.routeLabel = body.routeLabel.trim();
      if (body.pickupDate !== undefined) patch.pickupDate = body.pickupDate.trim();
      if (body.pickupTime !== undefined) patch.pickupTime = body.pickupTime.trim();
      if (body.returnDate !== undefined) patch.returnDate = body.returnDate;
      if (body.returnTime !== undefined) patch.returnTime = body.returnTime;
      if (body.vehicleId !== undefined) patch.vehicleId = body.vehicleId || null;
      if (body.driverId !== undefined) patch.driverId = body.driverId || null;
      if (body.tripType !== undefined) {
        if (!TRIP_TYPES.has(body.tripType)) {
          res.status(400).json({ error: "Loại chuyến không hợp lệ" });
          return;
        }
        patch.tripType = body.tripType;
      }
      if (body.passengers !== undefined) {
        patch.passengers = Math.max(1, Number(body.passengers) || 1);
      }
      if (body.note !== undefined) patch.note = body.note.trim();
      if (body.tripPrice !== undefined) {
        const n = Number(body.tripPrice);
        if (!Number.isFinite(n) || n < 0) {
          res.status(400).json({ error: "Giá chuyến không hợp lệ" });
          return;
        }
        patch.tripPrice = n;
      }
      if (body.expenseTotal !== undefined) {
        const n = Number(body.expenseTotal);
        if (!Number.isFinite(n) || n < 0) {
          res.status(400).json({ error: "Chi phí không hợp lệ" });
          return;
        }
        patch.expenseTotal = n;
      }
      if (body.revenueAmount !== undefined) {
        const n = Number(body.revenueAmount);
        if (!Number.isFinite(n) || n < 0) {
          res.status(400).json({ error: "Doanh thu không hợp lệ" });
          return;
        }
        patch.revenueAmount = n;
      }

      const result = await col.findOneAndUpdate(
        { id },
        { $set: patch },
        { returnDocument: "after" },
      );
      res.status(200).json(stripDoc(normalizeTripDoc(result!)));
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH"]);
  });
}

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
  rideBookingsCol,
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
  startOdometer?: number | null;
  endOdometer?: number | null;
  actualCosts?: {
    fuelLiters?: number | null;
    fuelPricePerLiter?: number | null;
    fuelAmount?: number | null;
    driverFee?: number | null;
    items?: Array<{
      id?: string;
      category?: string;
      name?: string;
      amount?: number;
      note?: string;
    }>;
  } | null;
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

        const patch: Record<string, unknown> = {
          status,
          statusHistory: pushStatusEvent(current.statusHistory, status, {
            note: body.note,
          }),
          updatedAt: now,
        };

        if (status === "COMPLETED") {
          const startOdo =
            body.startOdometer != null
              ? Number(body.startOdometer)
              : current.startOdometer != null
                ? Number(current.startOdometer)
                : null;
          const endOdo =
            body.endOdometer != null ? Number(body.endOdometer) : null;
          if (endOdo != null) {
            if (!Number.isFinite(endOdo) || endOdo < 0) {
              res.status(400).json({ error: "ODO cuối không hợp lệ" });
              return;
            }
            if (startOdo != null && endOdo < startOdo) {
              res.status(400).json({
                error: "ODO cuối phải lớn hơn hoặc bằng ODO đầu",
              });
              return;
            }
            patch.startOdometer = startOdo;
            patch.endOdometer = endOdo;
            if (current.vehicleId) {
              const vehicles = await rideVehiclesCol();
              const vehicle = await vehicles.findOne({ id: current.vehicleId });
              if (vehicle) {
                const currentOdo = Number(vehicle.currentOdometer);
                const nextOdo =
                  Number.isFinite(currentOdo)
                    ? Math.max(currentOdo, endOdo)
                    : endOdo;
                await vehicles.updateOne(
                  { id: current.vehicleId },
                  {
                    $set: {
                      currentOdometer: nextOdo,
                      updatedAt: now,
                    },
                  },
                );
              }
            }
          }
        }

        const result = await col.findOneAndUpdate(
          { id },
          { $set: patch },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(normalizeTripDoc(result!)));
        return;
      }

      if (action === "setActualCosts") {
        if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_UPDATE))) return;
        const raw = body.actualCosts ?? null;
        if (!raw) {
          res.status(400).json({ error: "Thiếu dữ liệu chi phí thực tế" });
          return;
        }
        const fuelLiters =
          raw.fuelLiters != null ? Number(raw.fuelLiters) : null;
        const fuelPricePerLiter =
          raw.fuelPricePerLiter != null ? Number(raw.fuelPricePerLiter) : null;
        let fuelAmount =
          raw.fuelAmount != null ? Number(raw.fuelAmount) : null;
        if (
          fuelAmount == null &&
          fuelLiters != null &&
          fuelPricePerLiter != null &&
          Number.isFinite(fuelLiters) &&
          Number.isFinite(fuelPricePerLiter)
        ) {
          fuelAmount = Math.round(fuelLiters * fuelPricePerLiter);
        }
        const driverFee =
          raw.driverFee != null ? Number(raw.driverFee) : null;
        const items = (Array.isArray(raw.items) ? raw.items : []).map(
          (item, idx) => ({
            id: String(item.id ?? `item-${idx + 1}`),
            category: String(item.category ?? "other"),
            name: String(item.name ?? "Chi phí khác").trim(),
            amount: Math.max(0, Number(item.amount) || 0),
            note: item.note ? String(item.note) : undefined,
          }),
        );
        const itemsTotal = items.reduce((s, i) => s + i.amount, 0);
        const expenseTotal =
          (Number.isFinite(fuelAmount) ? Number(fuelAmount) : 0) +
          (Number.isFinite(driverFee) ? Number(driverFee) : 0) +
          itemsTotal;
        const actualCosts = {
          fuelLiters,
          fuelPricePerLiter,
          fuelAmount,
          driverFee,
          items,
        };
        const result = await col.findOneAndUpdate(
          { id },
          {
            $set: {
              actualCosts,
              expenseTotal,
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
            pickupTime: current.pickupTime,
            returnDate: current.returnDate,
            returnTime: current.returnTime,
            plannedEndAt: current.plannedEndAt,
            plannedDurationMinutes: current.plannedDurationMinutes,
            excludeTripId: id,
          })
        ) {
          res.status(409).json({
            error: "Xe đã có chuyến trong khoảng thời gian này.",
          });
          return;
        }
        if (
          await hasTripDriverConflict({
            driverId,
            pickupDate: current.pickupDate,
            pickupTime: current.pickupTime,
            returnDate: current.returnDate,
            returnTime: current.returnTime,
            plannedEndAt: current.plannedEndAt,
            plannedDurationMinutes: current.plannedDurationMinutes,
            excludeTripId: id,
          })
        ) {
          res.status(409).json({
            error: "Tài xế đã có chuyến trong khoảng thời gian này.",
          });
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

        const { tripWindow } = await import("../../../_lib/ride-schedule.js");
        const win = tripWindow(current);
        const plannedEndAt = new Date(win.endMs).toISOString();
        const plannedDurationMinutes = Math.max(
          30,
          Math.round((win.endMs - win.startMs) / 60_000),
        );

        const result = await col.findOneAndUpdate(
          { id },
          {
            $set: {
              vehicleId,
              driverId,
              plannedEndAt,
              plannedDurationMinutes,
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

    if (req.method === "DELETE") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_DELETE))) {
        return;
      }
      const trip = await col.findOne({ id });
      if (!trip) {
        res.status(404).json({ error: "Không tìm thấy chuyến xe" });
        return;
      }
      if (trip.bookingId) {
        const bookings = await rideBookingsCol();
        await bookings.updateOne(
          { id: trip.bookingId },
          {
            $set: {
              tripId: null,
              updatedAt: new Date().toISOString(),
            },
          },
        );
      }
      await col.deleteOne({ id });
      res.status(204).end();
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
  });
}

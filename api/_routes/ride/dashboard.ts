import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import {
  rideBookingsCol,
  rideTripsCol,
  rideVehiclesCol,
  stripDoc,
} from "../../_lib/mongo.js";
import { buildSchedule } from "../../_lib/ride-schedule.js";
import { buildFleetReminders } from "../../_lib/ride-reminders.js";

function startOfTodayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (
      !(await requirePermission(req, res, PERMISSIONS.FLEET_DASHBOARD_VIEW))
    ) {
      return;
    }
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const range = typeof req.query.range === "string" ? req.query.range : "today";
    const today = startOfTodayIsoDate();
    let from = today;
    let to = today;
    if (range === "7d") {
      from = addDays(today, -6);
    } else if (range === "month") {
      from = `${today.slice(0, 8)}01`;
      to = today;
    }

    const bookings = await rideBookingsCol();
    const trips = await rideTripsCol();
    const vehicles = await rideVehiclesCol();

    const inRange = await bookings
      .find({
        pickupDate: { $gte: from, $lte: to },
        status: { $ne: "CANCELLED" },
      })
      .toArray();

    const bookingCount = inRange.length;
    const tripCount = inRange.filter((b) =>
      ["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "IN_PROGRESS", "COMPLETED"].includes(
        b.status,
      ),
    ).length;

    const tripsInRange = await trips
      .find({
        pickupDate: { $gte: from, $lte: to },
        status: { $ne: "CANCELLED" },
      })
      .toArray();

    const revenue = tripsInRange.reduce(
      (sum, t) => sum + (Number(t.tripPrice) || 0),
      0,
    );
    const expense = tripsInRange.reduce(
      (sum, t) => sum + (Number(t.expenseTotal) || 0),
      0,
    );
    const profit = revenue - expense;

    const pending = await bookings
      .find({ status: "PENDING" })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const upcoming = await bookings
      .find({
        pickupDate: { $gte: today },
        status: {
          $in: ["CONFIRMED", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "IN_PROGRESS"],
        },
      })
      .sort({ pickupDate: 1, pickupTime: 1 })
      .limit(10)
      .toArray();

    const allVehicles = await vehicles.find({}).toArray();
    const vehicleStats = {
      total: allVehicles.length,
      active: allVehicles.filter((v) => v.active && v.status !== "INACTIVE").length,
      onTrip: allVehicles.filter((v) => v.status === "ON_TRIP").length,
      maintenance: allVehicles.filter((v) => v.status === "MAINTENANCE").length,
    };

    const scheduleToday = await buildSchedule({ from: today, to: today });
    const reminders = buildFleetReminders(allVehicles);

    res.status(200).json({
      range,
      from,
      to,
      stats: {
        bookingCount,
        tripCount,
        revenue,
        expense,
        profit,
      },
      dispatchToday: scheduleToday.summary,
      reminders,
      pending: pending.map((p) => stripDoc(p)),
      upcoming: upcoming.map((u) => stripDoc(u)),
      vehicleStats,
    });
  });
}

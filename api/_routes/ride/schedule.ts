import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import { buildSchedule, listAvailability } from "../../_lib/ride-schedule.js";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requirePermission(req, res, PERMISSIONS.FLEET_TRIP_VIEW))) {
      return;
    }
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const q = req.query;
    if (q.availability === "1" || q.mode === "availability") {
      const startMs = Number(q.startMs);
      const endMs = Number(q.endMs);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        res.status(400).json({ error: "Khung thời gian không hợp lệ" });
        return;
      }
      const data = await listAvailability({
        startMs,
        endMs,
        excludeTripId:
          typeof q.excludeTripId === "string" ? q.excludeTripId : undefined,
        excludeBookingId:
          typeof q.excludeBookingId === "string"
            ? q.excludeBookingId
            : undefined,
      });
      res.status(200).json(data);
      return;
    }

    const date =
      typeof q.date === "string" && q.date ? q.date : todayIso();
    const from =
      typeof q.from === "string" && q.from ? q.from : date;
    const to = typeof q.to === "string" && q.to ? q.to : date;

    const data = await buildSchedule({
      from,
      to,
      vehicleId: typeof q.vehicleId === "string" ? q.vehicleId : undefined,
      driverId: typeof q.driverId === "string" ? q.driverId : undefined,
      status: typeof q.status === "string" ? q.status : undefined,
      serviceType: typeof q.serviceType === "string" ? q.serviceType : undefined,
    });

    res.status(200).json(data);
  });
}

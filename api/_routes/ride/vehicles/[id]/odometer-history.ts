import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../../_lib/access/catalog.js";
import { requirePermission } from "../../../../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../../../../_lib/http.js";
import { rideTripsCol, rideVehiclesCol, stripDoc } from "../../../../_lib/mongo.js";
import { normalizeTripDoc } from "../../../../_lib/ride-trip.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requirePermission(req, res, PERMISSIONS.FLEET_VEHICLE_VIEW))) {
      return;
    }
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    const vehicles = await rideVehiclesCol();
    const vehicle = await vehicles.findOne({ id });
    if (!vehicle) {
      res.status(404).json({ error: "Không tìm thấy xe" });
      return;
    }

    const trips = await rideTripsCol();
    const rows = await trips
      .find({
        vehicleId: id,
        $or: [
          { startOdometer: { $ne: null } },
          { endOdometer: { $ne: null } },
        ],
      })
      .sort({ pickupDate: -1, pickupTime: -1 })
      .limit(50)
      .toArray();

    res.status(200).json({
      vehicleId: id,
      currentOdometer: vehicle.currentOdometer ?? null,
      entries: rows.map((raw) => {
        const trip = normalizeTripDoc(raw);
        return {
          tripId: trip.id,
          tripCode: trip.tripCode,
          pickupDate: trip.pickupDate,
          pickupTime: trip.pickupTime,
          startOdometer: trip.startOdometer ?? null,
          endOdometer: trip.endOdometer ?? null,
          status: trip.status,
        };
      }),
      vehicle: stripDoc(vehicle),
    });
  });
}

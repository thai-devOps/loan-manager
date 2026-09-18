import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import { rideVehiclesCol } from "../../_lib/mongo.js";
import { buildFleetReminders } from "../../_lib/ride-reminders.js";

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
    const vehicles = await rideVehiclesCol();
    const rows = await vehicles.find({}).toArray();
    res.status(200).json(buildFleetReminders(rows));
  });
}

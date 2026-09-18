import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../_lib/http.js";
import {
  getRideSettings,
  updateRideSettings,
} from "../../_lib/ride-settings.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_BOOKING_VIEW))) {
        return;
      }
      res.status(200).json(await getRideSettings());
      return;
    }

    if (req.method === "PATCH") {
      if (
        !(await requirePermission(req, res, PERMISSIONS.FLEET_BOOKING_UPDATE))
      ) {
        return;
      }
      const body = readJsonBody<{
        bookingAntiSpamEnabled?: boolean | null;
      }>(req);

      if (
        body.bookingAntiSpamEnabled !== undefined &&
        body.bookingAntiSpamEnabled !== null &&
        typeof body.bookingAntiSpamEnabled !== "boolean"
      ) {
        res.status(400).json({ error: "Giá trị không hợp lệ" });
        return;
      }

      const updated = await updateRideSettings({
        bookingAntiSpamEnabled: body.bookingAntiSpamEnabled,
      });
      res.status(200).json(updated);
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH"]);
  });
}

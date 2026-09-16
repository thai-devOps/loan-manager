import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../_lib/http.js";
import type { DriverStatus, RideDriver } from "../../_lib/ride-types.js";
import { rideDriversCol, stripDoc } from "../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const driverPerm =
      req.method === "GET"
        ? PERMISSIONS.FLEET_DRIVER_VIEW
        : PERMISSIONS.FLEET_DRIVER_CREATE;
    if (!(await requirePermission(req, res, driverPerm))) return;
    const col = await rideDriversCol();

    if (req.method === "GET") {
      const rows = await col.find({}).sort({ name: 1 }).toArray();
      res.status(200).json(rows.map((r) => stripDoc(r)));
      return;
    }

    if (req.method === "POST") {
      const body = readJsonBody<Partial<RideDriver>>(req);
      const name = (body.name ?? "").trim();
      const phone = (body.phone ?? "").trim();
      if (!name || !phone) {
        res.status(400).json({ error: "Vui lòng nhập tên và số điện thoại" });
        return;
      }
      const now = new Date().toISOString();
      const id = randomUUID();
      const driver: RideDriver = {
        _id: id,
        id,
        name,
        phone,
        avatar: body.avatar?.trim() || undefined,
        licenseType: body.licenseType?.trim() || undefined,
        licenseExpiry: body.licenseExpiry?.trim() || undefined,
        active: body.active !== false,
        status: (body.status as DriverStatus) || "AVAILABLE",
        createdAt: now,
        updatedAt: now,
      };
      await col.insertOne(driver);
      res.status(201).json(stripDoc(driver));
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import type { DriverStatus } from "../../../_lib/ride-types.js";
import { rideDriversCol, stripDoc } from "../../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const driverPerm =
      req.method === "GET"
        ? PERMISSIONS.FLEET_DRIVER_VIEW
        : req.method === "DELETE"
          ? PERMISSIONS.FLEET_DRIVER_DELETE
          : PERMISSIONS.FLEET_DRIVER_UPDATE;
    if (!(await requirePermission(req, res, driverPerm))) return;
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const col = await rideDriversCol();

    if (req.method === "GET") {
      const row = await col.findOne({ id });
      if (!row) {
        res.status(404).json({ error: "Không tìm thấy tài xế" });
        return;
      }
      res.status(200).json(stripDoc(row));
      return;
    }

    if (req.method === "PATCH") {
      const body = readJsonBody<Record<string, unknown>>(req);
      const name = String(body.name ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      if (!name || !phone) {
        res.status(400).json({ error: "Vui lòng nhập tên và số điện thoại" });
        return;
      }
      const result = await col.findOneAndUpdate(
        { id },
        {
          $set: {
            name,
            phone,
            avatar: String(body.avatar ?? "").trim() || undefined,
            licenseType: String(body.licenseType ?? "").trim() || undefined,
            licenseExpiry: String(body.licenseExpiry ?? "").trim() || undefined,
            active: body.active !== false,
            status: (body.status as DriverStatus) || "AVAILABLE",
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" },
      );
      if (!result) {
        res.status(404).json({ error: "Không tìm thấy tài xế" });
        return;
      }
      res.status(200).json(stripDoc(result));
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH"]);
  });
}

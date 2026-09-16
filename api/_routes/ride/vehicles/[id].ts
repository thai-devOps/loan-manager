import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import type { SuitableFor, VehicleStatus } from "../../../_lib/ride-types.js";
import { rideVehiclesCol, stripDoc } from "../../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const col = await rideVehiclesCol();

    if (req.method === "GET") {
      const row = await col.findOne({ id });
      if (!row) {
        res.status(404).json({ error: "Không tìm thấy xe" });
        return;
      }
      res.status(200).json(stripDoc(row));
      return;
    }

    if (req.method === "PATCH") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_VEHICLE_UPDATE))) return;
      const body = readJsonBody<Record<string, unknown>>(req);
      const name = String(body.name ?? "").trim();
      if (!name) {
        res.status(400).json({ error: "Vui lòng nhập tên xe" });
        return;
      }
      const result = await col.findOneAndUpdate(
        { id },
        {
          $set: {
            name,
            brand: String(body.brand ?? "").trim(),
            model: String(body.model ?? "").trim(),
            licensePlate: String(body.licensePlate ?? "").trim(),
            seats: Number(body.seats) || 4,
            transmission: String(body.transmission ?? "Số tự động").trim(),
            fuel: String(body.fuel ?? "Xăng").trim(),
            year: body.year ? Number(body.year) : undefined,
            images: Array.isArray(body.images) ? body.images : [],
            features: Array.isArray(body.features) ? body.features : [],
            suitableFor: (Array.isArray(body.suitableFor)
              ? body.suitableFor
              : []) as SuitableFor[],
            active: body.active !== false,
            status: (body.status as VehicleStatus) || "AVAILABLE",
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" },
      );
      if (!result) {
        res.status(404).json({ error: "Không tìm thấy xe" });
        return;
      }
      res.status(200).json(stripDoc(result));
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH"]);
  });
}

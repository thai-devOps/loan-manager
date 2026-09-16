import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../_lib/http.js";
import type { RideVehicle, SuitableFor, VehicleStatus } from "../../_lib/ride-types.js";
import { rideVehiclesCol, stripDoc } from "../../_lib/mongo.js";
import { SEED_VEHICLES } from "../../_lib/ride-seed.js";

async function ensureSeed(): Promise<void> {
  const col = await rideVehiclesCol();
  const count = await col.countDocuments();
  if (count > 0) return;
  const now = new Date().toISOString();
  await col.insertMany(
    SEED_VEHICLES.map((v) => ({
      ...v,
      _id: v.id,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const col = await rideVehiclesCol();

    if (req.method === "GET") {
      // Public list for customer site + auth admin
      await ensureSeed();
      const activeOnly = req.query.active === "1" || req.query.active === "true";
      const filter = activeOnly ? { active: true } : {};
      const rows = await col.find(filter).sort({ seats: 1, name: 1 }).toArray();
      res.status(200).json(rows.map((r) => stripDoc(r)));
      return;
    }

    if (req.method === "POST") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_VEHICLE_CREATE))) return;
      const body = readJsonBody<Partial<RideVehicle>>(req);
      const name = (body.name ?? "").trim();
      if (!name) {
        res.status(400).json({ error: "Vui lòng nhập tên xe" });
        return;
      }
      const now = new Date().toISOString();
      const id = randomUUID();
      const vehicle: RideVehicle = {
        _id: id,
        id,
        name,
        brand: (body.brand ?? "").trim(),
        model: (body.model ?? "").trim(),
        licensePlate: (body.licensePlate ?? "").trim(),
        seats: Number(body.seats) || 4,
        transmission: (body.transmission ?? "Số tự động").trim(),
        fuel: (body.fuel ?? "Xăng").trim(),
        year: body.year ? Number(body.year) : undefined,
        images: Array.isArray(body.images) ? body.images : [],
        features: Array.isArray(body.features) ? body.features : ["Xe riêng + tài xế"],
        suitableFor: (Array.isArray(body.suitableFor)
          ? body.suitableFor
          : ["travel"]) as SuitableFor[],
        active: body.active !== false,
        status: (body.status as VehicleStatus) || "AVAILABLE",
        createdAt: now,
        updatedAt: now,
      };
      await col.insertOne(vehicle);
      res.status(201).json(stripDoc(vehicle));
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

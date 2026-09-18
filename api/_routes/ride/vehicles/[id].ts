import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import type {
  SuitableFor,
  VehicleInsurance,
  VehicleMaintenanceLog,
  VehiclePricingConfig,
  VehicleStatus,
} from "../../../_lib/ride-types.js";
import { rideVehiclesCol, stripDoc } from "../../../_lib/mongo.js";
import { resolveVehiclePricing } from "../../../../shared/ride/vehicle-pricing.js";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

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
      const action = typeof body.action === "string" ? body.action : undefined;
      const now = new Date().toISOString();
      const current = await col.findOne({ id });
      if (!current) {
        res.status(404).json({ error: "Không tìm thấy xe" });
        return;
      }

      if (action === "addMaintenance") {
        const title = String(body.title ?? "").trim();
        const date = String(body.date ?? now.slice(0, 10)).trim();
        const odometer = Number(body.odometer);
        if (!title) {
          res.status(400).json({ error: "Vui lòng nhập nội dung bảo dưỡng" });
          return;
        }
        if (!Number.isFinite(odometer) || odometer < 0) {
          res.status(400).json({ error: "ODO bảo dưỡng không hợp lệ" });
          return;
        }
        const log: VehicleMaintenanceLog = {
          id: newId("mnt"),
          date,
          odometer,
          title,
          cost: body.cost != null ? Number(body.cost) || 0 : undefined,
          garage: body.garage ? String(body.garage).trim() : undefined,
          note: body.note ? String(body.note).trim() : undefined,
          attachmentUrl: body.attachmentUrl
            ? String(body.attachmentUrl)
            : null,
        };
        const logs = [...(current.maintenanceLogs ?? []), log];
        const currentOdo = Number(current.currentOdometer);
        const nextOdo =
          Number.isFinite(currentOdo) ? Math.max(currentOdo, odometer) : odometer;
        const result = await col.findOneAndUpdate(
          { id },
          {
            $set: {
              maintenanceLogs: logs,
              lastMaintenanceAt: date,
              lastMaintenanceOdometer: odometer,
              currentOdometer: nextOdo,
              nextMaintenanceOdometer:
                body.nextMaintenanceOdometer != null
                  ? numOrNull(body.nextMaintenanceOdometer)
                  : current.nextMaintenanceOdometer ?? null,
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(result!));
        return;
      }

      if (action === "addInsurance") {
        const type = String(body.type ?? "").trim();
        if (!type) {
          res.status(400).json({ error: "Vui lòng nhập loại bảo hiểm" });
          return;
        }
        const insurance: VehicleInsurance = {
          id: newId("ins"),
          type,
          provider: body.provider ? String(body.provider).trim() : undefined,
          startDate: body.startDate ? String(body.startDate).slice(0, 10) : undefined,
          endDate: body.endDate ? String(body.endDate).slice(0, 10) : undefined,
          note: body.note ? String(body.note).trim() : undefined,
          attachmentUrl: body.attachmentUrl
            ? String(body.attachmentUrl)
            : null,
        };
        const insurances = [...(current.insurances ?? []), insurance];
        const result = await col.findOneAndUpdate(
          { id },
          {
            $set: {
              insurances,
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(result!));
        return;
      }

      const name = String(body.name ?? current.name ?? "").trim();
      if (!name) {
        res.status(400).json({ error: "Vui lòng nhập tên xe" });
        return;
      }

      const result = await col.findOneAndUpdate(
        { id },
        {
          $set: {
            name,
            brand: String(body.brand ?? current.brand ?? "").trim(),
            model: String(body.model ?? current.model ?? "").trim(),
            licensePlate: String(
              body.licensePlate ?? current.licensePlate ?? "",
            ).trim(),
            seats: Number(body.seats ?? current.seats) || 4,
            transmission: String(
              body.transmission ?? current.transmission ?? "Số tự động",
            ).trim(),
            fuel: String(body.fuel ?? current.fuel ?? "Xăng").trim(),
            year:
              body.year != null
                ? Number(body.year) || undefined
                : current.year,
            images: Array.isArray(body.images)
              ? body.images
              : (current.images ?? []),
            features: Array.isArray(body.features)
              ? body.features
              : (current.features ?? []),
            suitableFor: (Array.isArray(body.suitableFor)
              ? body.suitableFor
              : (current.suitableFor ?? [])) as SuitableFor[],
            pricing: resolveVehiclePricing(
              (body.pricing as Partial<VehiclePricingConfig> | undefined) ??
                current.pricing,
              String(body.fuel ?? current.fuel ?? "Xăng").trim(),
            ),
            active:
              body.active !== undefined
                ? body.active !== false
                : current.active !== false,
            status:
              (body.status as VehicleStatus) ||
              current.status ||
              "AVAILABLE",
            currentOdometer:
              body.currentOdometer !== undefined
                ? numOrNull(body.currentOdometer)
                : (current.currentOdometer ?? null),
            nextMaintenanceOdometer:
              body.nextMaintenanceOdometer !== undefined
                ? numOrNull(body.nextMaintenanceOdometer)
                : (current.nextMaintenanceOdometer ?? null),
            lastMaintenanceAt:
              body.lastMaintenanceAt !== undefined
                ? body.lastMaintenanceAt
                  ? String(body.lastMaintenanceAt).slice(0, 10)
                  : null
                : (current.lastMaintenanceAt ?? null),
            lastMaintenanceOdometer:
              body.lastMaintenanceOdometer !== undefined
                ? numOrNull(body.lastMaintenanceOdometer)
                : (current.lastMaintenanceOdometer ?? null),
            registrationExpiry:
              body.registrationExpiry !== undefined
                ? body.registrationExpiry
                  ? String(body.registrationExpiry).slice(0, 10)
                  : null
                : (current.registrationExpiry ?? null),
            updatedAt: now,
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

    if (req.method === "DELETE") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_VEHICLE_DELETE))) return;
      const result = await col.deleteOne({ id });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: "Không tìm thấy xe" });
        return;
      }
      res.status(204).end();
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
  });
}

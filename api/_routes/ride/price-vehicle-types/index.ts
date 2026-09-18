import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  createPriceVehicleType,
  listPriceVehicleTypes,
} from "../../../_lib/ride-price-matrix.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_VIEW))) {
        return;
      }
      const all =
        typeof req.query.all === "string" ? req.query.all === "1" : true;
      res.status(200).json({ items: await listPriceVehicleTypes(all) });
      return;
    }

    if (req.method === "POST") {
      if (
        !(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_CREATE))
      ) {
        return;
      }
      const body = readJsonBody<{
        name?: string;
        seats?: number;
        active?: boolean;
        sortOrder?: number;
      }>(req);
      try {
        const item = await createPriceVehicleType({
          name: body.name ?? "",
          seats: Number(body.seats),
          active: body.active,
          sortOrder: body.sortOrder,
        });
        res.status(201).json(item);
      } catch (e) {
        res
          .status(400)
          .json({ error: e instanceof Error ? e.message : "Tạo thất bại" });
      }
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

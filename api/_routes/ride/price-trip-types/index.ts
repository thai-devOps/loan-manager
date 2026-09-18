import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  listPriceTripTypes,
  updatePriceTripType,
} from "../../../_lib/ride-price-matrix.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_VIEW))) {
        return;
      }
      const all =
        typeof req.query.all === "string" ? req.query.all === "1" : true;
      res.status(200).json({ items: await listPriceTripTypes(all) });
      return;
    }

    if (req.method === "PATCH") {
      if (
        !(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_UPDATE))
      ) {
        return;
      }
      const body = readJsonBody<{
        id?: string;
        name?: string;
        active?: boolean;
        sortOrder?: number;
      }>(req);
      const id = (body.id ?? "").trim();
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      try {
        res.status(200).json(
          await updatePriceTripType(id, {
            name: body.name,
            active: body.active,
            sortOrder: body.sortOrder,
          }),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Cập nhật thất bại";
        res.status(msg.includes("Không tìm thấy") ? 404 : 400).json({ error: msg });
      }
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH"]);
  });
}

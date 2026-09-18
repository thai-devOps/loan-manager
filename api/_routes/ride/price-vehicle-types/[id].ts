import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import { updatePriceVehicleType } from "../../../_lib/ride-price-matrix.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    if (req.method === "PATCH") {
      if (
        !(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_UPDATE))
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
        res.status(200).json(await updatePriceVehicleType(id, body));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Cập nhật thất bại";
        res.status(msg.includes("Không tìm thấy") ? 404 : 400).json({ error: msg });
      }
      return;
    }

    methodNotAllowed(res, ["PATCH"]);
  });
}

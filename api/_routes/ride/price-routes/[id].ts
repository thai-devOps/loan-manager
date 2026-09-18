import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  deletePriceRoute,
  getPriceRoute,
  updatePriceRoute,
} from "../../../_lib/ride-price-matrix.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_VIEW))) {
        return;
      }
      const item = await getPriceRoute(id);
      if (!item) {
        res.status(404).json({ error: "Không tìm thấy tuyến" });
        return;
      }
      res.status(200).json(item);
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
        origin?: string;
        destination?: string;
        active?: boolean;
        sortOrder?: number;
      }>(req);
      try {
        res.status(200).json(await updatePriceRoute(id, body));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Cập nhật thất bại";
        res.status(msg.includes("Không tìm thấy") ? 404 : 400).json({ error: msg });
      }
      return;
    }

    if (req.method === "DELETE") {
      if (
        !(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_DELETE))
      ) {
        return;
      }
      try {
        await deletePriceRoute(id);
        res.status(204).end();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Xóa thất bại";
        res.status(msg.includes("Không tìm thấy") ? 404 : 400).json({ error: msg });
      }
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
  });
}

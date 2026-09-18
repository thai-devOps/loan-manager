import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  listPriceCells,
  upsertPriceCell,
  upsertPriceCellsBulk,
} from "../../../_lib/ride-price-matrix.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_VIEW))) {
        return;
      }
      const routeId =
        typeof req.query.routeId === "string" ? req.query.routeId : undefined;
      res.status(200).json({ items: await listPriceCells(routeId) });
      return;
    }

    if (req.method === "PUT") {
      if (
        !(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_UPDATE))
      ) {
        return;
      }
      const body = readJsonBody<{
        routeId?: string;
        vehicleTypeId?: string;
        tripTypeId?: string;
        amount?: number | null;
        cells?: Array<{
          routeId: string;
          vehicleTypeId: string;
          tripTypeId: string;
          amount: number | null;
        }>;
        bulk?: boolean;
      }>(req);

      try {
        if (body.bulk || Array.isArray(body.cells)) {
          const result = await upsertPriceCellsBulk(body.cells ?? []);
          res.status(200).json(result);
          return;
        }
        const item = await upsertPriceCell({
          routeId: body.routeId ?? "",
          vehicleTypeId: body.vehicleTypeId ?? "",
          tripTypeId: body.tripTypeId ?? "",
          amount: body.amount ?? null,
        });
        res.status(200).json({ item });
      } catch (e) {
        res
          .status(400)
          .json({ error: e instanceof Error ? e.message : "Lưu thất bại" });
      }
      return;
    }

    methodNotAllowed(res, ["GET", "PUT"]);
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requirePermission } from "../../_lib/auth.js";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import {
  methodNotAllowed,
  readJsonBody,
  withHandler,
} from "../../_lib/http.js";
import { FuelPriceError, fuelPriceErrorToClient } from "../../_lib/fuel-price/errors.js";
import {
  syncLatestPvoilFuelPrice,
  syncPvoilDate,
} from "../../_lib/fuel-price/sync-service.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }
    const auth = await requirePermission(
      req,
      res,
      PERMISSIONS.FLEET_PRICING_UPDATE,
    );
    if (!auth) return;

    try {
      const body = readJsonBody<{ date?: string }>(req);
      const date = typeof body?.date === "string" ? body.date.trim() : "";
      const result = date
        ? await syncPvoilDate(date)
        : await syncLatestPvoilFuelPrice();

      res.status(200).json({
        ok: true,
        status: result.status,
        source: result.source,
        effectiveAt: result.effectiveAt,
        effectiveDateRaw: result.effectiveDateRaw,
        productCount: result.productCount,
        products: result.products,
        crawledAt: result.crawledAt,
      });
    } catch (e) {
      const client = fuelPriceErrorToClient(e);
      console.error("[admin/fuel-sync] failed", {
        code: client.code,
        error: e instanceof Error ? e.message : String(e),
        at: new Date().toISOString(),
      });
      const status =
        e instanceof FuelPriceError && e.code === "UNAUTHORIZED" ? 401 : 503;
      res.status(status).json({
        error: client.message,
        code: client.code,
      });
    }
  });
}

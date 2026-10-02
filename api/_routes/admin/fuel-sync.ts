import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requirePermission } from "../../_lib/auth.js";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import {
  FuelPriceError,
  fuelPriceErrorToClient,
} from "../../_lib/fuel-price/errors.js";
import {
  findLatestFuelPriceSnapshot,
  syncLatestFuelPrice,
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
      const result = await syncLatestFuelPrice({ trigger: "ADMIN" });

      res.status(200).json({
        ok: true,
        success: result.success,
        status: result.status,
        source: result.source,
        provider: result.provider ?? result.source,
        effectiveAt: result.effectiveAt,
        effectiveDateRaw: result.effectiveDateRaw,
        productCount: result.productCount,
        products: result.products,
        crawledAt: result.crawledAt,
        changed: result.changed,
        warnings: result.warnings,
        isStale: result.isStale,
        staleHours: result.staleHours,
        region: result.region,
        message:
          result.message ??
          "Đồng bộ giá xăng Petrolimex thành công",
      });
    } catch (e) {
      const client = fuelPriceErrorToClient(e);
      console.error("[admin/fuel-sync] failed", {
        code: client.code,
        error: e instanceof Error ? e.message : String(e),
        at: new Date().toISOString(),
      });
      const fallback = await findLatestFuelPriceSnapshot().catch(() => null);
      const status =
        e instanceof FuelPriceError && e.code === "UNAUTHORIZED" ? 401 : 503;
      res.status(status).json({
        success: false,
        provider: "PETROLIMEX",
        error: client.message,
        code: client.code,
        errorCode: client.code,
        message: "Không thể lấy dữ liệu giá xăng Petrolimex",
        fallbackAvailable: Boolean(fallback),
      });
    }
  });
}

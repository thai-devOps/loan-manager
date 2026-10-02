import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requirePermission } from "../../_lib/auth.js";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import { listFuelPriceHistory } from "../../_lib/fuel-price/sync-service.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const auth = await requirePermission(
      req,
      res,
      PERMISSIONS.FLEET_PRICING_VIEW,
    );
    if (!auth) return;

    const q = req.query as Record<string, string | string[] | undefined>;
    const page = typeof q.page === "string" ? Number(q.page) : 1;
    const limit = typeof q.limit === "string" ? Number(q.limit) : 20;
    const from = typeof q.from === "string" ? q.from : undefined;
    const to = typeof q.to === "string" ? q.to : undefined;

    const result = await listFuelPriceHistory({ page, limit, from, to });
    res.status(200).json({
      items: result.items.map((d) => ({
        id: d.id,
        source: d.source,
        effectiveAt: d.effectiveAt,
        effectiveDateRaw: d.effectiveDateRaw,
        products: d.products,
        sourceUrl: d.sourceUrl,
        crawledAt: d.crawledAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  });
}

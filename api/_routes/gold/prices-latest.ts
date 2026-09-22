import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requirePermission } from "../../_lib/auth.js";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import { getGoldPrices } from "../../_lib/gold-price/sync-service.js";
import { getPnjZone } from "../../_lib/gold-price/pnj-provider.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const auth = await requirePermission(req, res, PERMISSIONS.ASSET_ASSET_VIEW);
    if (!auth) return;

    const q = req.query as Record<string, string | string[] | undefined>;
    const zone = typeof q.zone === "string" ? q.zone : undefined;

    try {
      const result = await getGoldPrices({
        zone: zone ?? getPnjZone(),
        source: "PNJ",
      });
      res.status(200).json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Không lấy được giá vàng";
      res.status(503).json({ error: message });
    }
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requirePermission } from "../../_lib/auth.js";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import { goldTypesCol, stripDoc } from "../../_lib/mongo.js";
import { getGoldPrices } from "../../_lib/gold-price/sync-service.js";
import { getPnjZone } from "../../_lib/gold-price/pnj-provider.js";
import type { GoldTypeCatalogEntry } from "../../_lib/gold-price/types.js";

function catalogFromPrices(
  prices: {
    sourceCode: string;
    sourceName: string;
    buyPricePerChi: number | null;
    sellPricePerChi: number | null;
  }[],
  meta: {
    source: "PNJ";
    zone: string;
    branch: string;
    sourceUpdatedAt: string | null;
    capturedAt: string;
  },
): GoldTypeCatalogEntry[] {
  const now = meta.capturedAt;
  return prices.map((p) => ({
    id: `ephemeral-${p.sourceCode}`,
    source: meta.source,
    sourceCode: p.sourceCode,
    sourceName: p.sourceName,
    zone: meta.zone,
    branch: meta.branch,
    lastBuyPricePerChi: p.buyPricePerChi,
    lastSellPricePerChi: p.sellPricePerChi,
    lastSourceUpdatedAt: meta.sourceUpdatedAt,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const auth = await requirePermission(req, res, PERMISSIONS.ASSET_ASSET_VIEW);
    if (!auth) return;

    const q = req.query as Record<string, string | string[] | undefined>;
    const zone = typeof q.zone === "string" ? q.zone : getPnjZone();

    const col = await goldTypesCol();
    const stored = await col
      .find({ source: "PNJ" })
      .sort({ sourceName: 1 })
      .toArray();

    let items: GoldTypeCatalogEntry[] = stored.map((doc) => stripDoc(doc));

    if (items.length === 0) {
      try {
        const result = await getGoldPrices({ zone, source: "PNJ" });
        items = catalogFromPrices(result.prices, {
          source: result.source,
          zone: result.zone,
          branch: result.branch,
          sourceUpdatedAt: result.sourceUpdatedAt,
          capturedAt: result.capturedAt,
        });
      } catch {
        // empty catalog — client shows empty select
      }
    } else if (zone) {
      // Prefer rows for requested zone when available, else keep all
      const zoned = items.filter((i) => i.zone === zone);
      if (zoned.length > 0) items = zoned;
    }

    res.status(200).json({
      source: "PNJ",
      zone,
      items,
    });
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import { forceSyncGoldPrices } from "../../_lib/gold-price/sync-service.js";
import { getPnjZone } from "../../_lib/gold-price/pnj-provider.js";

function authorizeSync(req: VercelRequest): boolean {
  const secret =
    (process.env.GOLD_PRICE_SYNC_SECRET ?? "").trim() ||
    (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;

  const header =
    (typeof req.headers["x-gold-price-sync-secret"] === "string"
      ? req.headers["x-gold-price-sync-secret"]
      : "") ||
    (typeof req.headers.authorization === "string" &&
    req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.slice("Bearer ".length).trim()
      : "");

  const q = req.query as Record<string, string | string[] | undefined>;
  const querySecret = typeof q.secret === "string" ? q.secret : "";

  return header === secret || querySecret === secret;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET" && req.method !== "POST") {
      methodNotAllowed(res, ["GET", "POST"]);
      return;
    }

    if (!authorizeSync(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const q = req.query as Record<string, string | string[] | undefined>;
    const zone = typeof q.zone === "string" ? q.zone : getPnjZone();

    try {
      const result = await forceSyncGoldPrices({ zone });
      res.status(200).json({
        ok: true,
        source: result.source,
        zone: result.zone,
        branch: result.branch,
        capturedAt: result.capturedAt,
        sourceUpdatedAt: result.sourceUpdatedAt,
        priceCount: result.prices.length,
      });
    } catch (e) {
      console.error("[gold-price-sync] failed", {
        zone,
        error: e instanceof Error ? e.message : String(e),
        at: new Date().toISOString(),
      });
      const message = e instanceof Error ? e.message : "Sync failed";
      res.status(503).json({ error: message });
    }
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import { fuelPriceErrorToClient } from "../../_lib/fuel-price/errors.js";
import { syncLatestPvoilFuelPrice } from "../../_lib/fuel-price/sync-service.js";

function authorizeSync(req: VercelRequest): boolean {
  const secret =
    (process.env.FUEL_PRICE_SYNC_SECRET ?? "").trim() ||
    (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;

  const header =
    (typeof req.headers["x-fuel-price-sync-secret"] === "string"
      ? req.headers["x-fuel-price-sync-secret"]
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
      res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      return;
    }

    try {
      const result = await syncLatestPvoilFuelPrice();
      res.status(200).json({
        ok: true,
        status: result.status,
        source: result.source,
        effectiveAt: result.effectiveAt,
        productCount: result.productCount,
        crawledAt: result.crawledAt,
      });
    } catch (e) {
      const client = fuelPriceErrorToClient(e);
      console.error("[fuel-price-sync] failed", {
        code: client.code,
        error: e instanceof Error ? e.message : String(e),
        at: new Date().toISOString(),
      });
      res.status(503).json({ error: client.message, code: client.code });
    }
  });
}

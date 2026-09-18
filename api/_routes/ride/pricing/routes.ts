import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, withHandler } from "../../../_lib/http.js";
import { listPublicPricingRoutes } from "../../../_lib/ride-pricing.js";

/** Public — ACTIVE ROUTE/AIRPORT pricing rules for the customer pricing page. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const date =
      typeof req.query.date === "string" ? req.query.date.trim() : undefined;
    const items = await listPublicPricingRoutes(date || undefined);
    res.status(200).json({ items });
  });
}

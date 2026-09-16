import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, withHandler } from "../../../_lib/http.js";
import { searchAddress } from "../../../_lib/ride-geocode.js";
import { RouteServiceError } from "../../../_lib/ride-route.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) {
      res.status(200).json([]);
      return;
    }

    try {
      const results = await searchAddress(q, { limit: 6 });
      res.status(200).json(results);
    } catch (e) {
      if (e instanceof RouteServiceError) {
        const status = e.code === "MISSING_KEY" ? 503 : 502;
        res.status(status).json({ error: e.message, code: e.code });
        return;
      }
      throw e;
    }
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, withHandler } from "../../../_lib/http.js";
import { getPublicPricingMatrix } from "../../../_lib/ride-price-matrix.js";

/** Public — active pricing matrix for customer page. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const data = await getPublicPricingMatrix();
    res.status(200).json(data);
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import {
  findLatestFuelPriceSnapshot,
  toPublicFuelSnapshot,
} from "../../_lib/fuel-price/sync-service.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const latest = await findLatestFuelPriceSnapshot();
    if (!latest) {
      res.status(404).json({ error: "Chưa có dữ liệu giá xăng dầu." });
      return;
    }

    res.status(200).json(toPublicFuelSnapshot(latest));
  });
}

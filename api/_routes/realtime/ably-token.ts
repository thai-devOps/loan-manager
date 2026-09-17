import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import { createAblyTokenRequest } from "../../_lib/realtime/ably.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const ctx = await requirePermission(
      req,
      res,
      PERMISSIONS.FLEET_BOOKING_VIEW,
    );
    if (!ctx) return;

    if (!process.env.ABLY_API_KEY?.trim()) {
      res.status(503).json({ error: "Realtime chưa được cấu hình" });
      return;
    }

    try {
      const tokenRequest = await createAblyTokenRequest(ctx.userId);
      res.status(200).json(tokenRequest);
    } catch (error) {
      console.error("[Realtime] Ably token generation failed", error);
      res.status(500).json({ error: "Không tạo được realtime token" });
    }
  });
}

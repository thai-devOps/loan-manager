import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import { auditLogsCol, stripDoc } from "../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const ctx = await requirePermission(req, res, PERMISSIONS.SETTINGS_VIEW);
    if (!ctx) return;

    const limitRaw =
      typeof req.query.limit === "string" ? Number(req.query.limit) : 100;
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 500)
      : 100;

    const col = await auditLogsCol();
    const logs = await col
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    res.status(200).json({ logs: logs.map((l) => stripDoc(l)) });
  });
}

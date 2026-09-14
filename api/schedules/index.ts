import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib/auth.js";
import { resolveScheduleStatus } from "../_lib/calculations.js";
import { methodNotAllowed, withHandler } from "../_lib/http.js";
import { schedulesCol, stripDoc } from "../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;

    if (req.method === "GET") {
      const status =
        typeof req.query.status === "string" ? req.query.status : "ALL";
      const col = await schedulesCol();
      let rows = await col.find({}).sort({ dueDate: 1 }).toArray();
      rows = rows.map((s) => ({
        ...s,
        status: resolveScheduleStatus(s),
      }));
      if (status !== "ALL") {
        rows = rows.filter((s) => s.status === status);
      }
      res.status(200).json(rows.map((r) => stripDoc(r)));
      return;
    }

    methodNotAllowed(res, ["GET"]);
  });
}

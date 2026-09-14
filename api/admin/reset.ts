import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../../server/lib/auth.js";
import { methodNotAllowed, withHandler } from "../../server/lib/http.js";
import {
  borrowersCol,
  loansCol,
  schedulesCol,
  transactionsCol,
} from "../../server/lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }
    await Promise.all([
      (await borrowersCol()).deleteMany({}),
      (await loansCol()).deleteMany({}),
      (await transactionsCol()).deleteMany({}),
      (await schedulesCol()).deleteMany({}),
    ]);
    res.status(200).json({ ok: true });
  });
}

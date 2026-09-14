import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib/auth";
import { methodNotAllowed, withHandler } from "../_lib/http";
import {
  borrowersCol,
  loansCol,
  schedulesCol,
  transactionsCol,
} from "../_lib/mongo";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const [borrowers, loans, transactions, schedules] = await Promise.all([
      (await borrowersCol()).countDocuments(),
      (await loansCol()).countDocuments(),
      (await transactionsCol()).countDocuments(),
      (await schedulesCol()).countDocuments(),
    ]);
    res.status(200).json({ borrowers, loans, transactions, schedules });
  });
}

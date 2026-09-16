import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requireAnyPermission } from "../../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import {
  borrowersCol,
  loansCol,
  schedulesCol,
  transactionsCol,
} from "../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (
      !(await requireAnyPermission(req, res, [
        PERMISSIONS.LOAN_DASHBOARD_VIEW,
        PERMISSIONS.REPORT_LOAN_VIEW,
      ]))
    ) {
      return;
    }
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

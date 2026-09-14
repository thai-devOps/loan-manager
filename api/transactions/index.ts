import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../../server/lib/auth.js";
import { methodNotAllowed, withHandler } from "../../server/lib/http.js";
import { stripDoc, transactionsCol } from "../../server/lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const type =
      typeof req.query.type === "string" ? req.query.type : undefined;
    const loanId =
      typeof req.query.loanId === "string" ? req.query.loanId : undefined;
    const filter: Record<string, string> = {};
    if (type && type !== "ALL") filter.type = type;
    if (loanId) filter.loanId = loanId;

    const rows = await (await transactionsCol())
      .find(filter)
      .sort({ transactionDate: -1 })
      .toArray();
    res.status(200).json(rows.map((r) => stripDoc(r)));
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import { stripDoc } from "../../../_lib/mongo.js";
import {
  createFinanceCategory,
  FinanceCategoryError,
  listFinanceCategories,
  type CategoryInput,
} from "../../../_lib/finance-categories.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    try {
      if (req.method === "GET") {
        if (!(await requirePermission(req, res, PERMISSIONS.FINANCE_TRANSACTION_VIEW))) {
          return;
        }
        const type = typeof req.query.type === "string" ? req.query.type : undefined;
        const includeInactive = req.query.includeInactive === "1";
        const rows = await listFinanceCategories({ type, includeInactive });
        res.status(200).json(rows.map((r) => stripDoc(r)));
        return;
      }
      if (req.method === "POST") {
        if (!(await requirePermission(req, res, PERMISSIONS.FINANCE_TRANSACTION_UPDATE))) {
          return;
        }
        const body = readJsonBody<CategoryInput>(req);
        const row = await createFinanceCategory(body);
        res.status(201).json(stripDoc(row));
        return;
      }
      methodNotAllowed(res, ["GET", "POST"]);
    } catch (e) {
      if (e instanceof FinanceCategoryError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      throw e;
    }
  });
}

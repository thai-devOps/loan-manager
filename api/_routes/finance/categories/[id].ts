import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import { stripDoc } from "../../../_lib/mongo.js";
import {
  FinanceCategoryError,
  removeFinanceCategory,
  updateFinanceCategory,
  type CategoryInput,
} from "../../../_lib/finance-categories.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    try {
      if (req.method === "PATCH") {
        if (!(await requirePermission(req, res, PERMISSIONS.FINANCE_TRANSACTION_UPDATE))) {
          return;
        }
        const body = readJsonBody<CategoryInput>(req);
        const row = await updateFinanceCategory(id, body);
        res.status(200).json(stripDoc(row));
        return;
      }
      if (req.method === "DELETE") {
        if (!(await requirePermission(req, res, PERMISSIONS.FINANCE_TRANSACTION_UPDATE))) {
          return;
        }
        const result = await removeFinanceCategory(id);
        res.status(200).json(result);
        return;
      }
      methodNotAllowed(res, ["PATCH", "DELETE"]);
    } catch (e) {
      if (e instanceof FinanceCategoryError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      throw e;
    }
  });
}

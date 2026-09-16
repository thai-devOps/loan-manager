import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { PERMISSIONS } from "../_lib/access/catalog.js";
import { requirePermission } from "../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../_lib/http.js";
import { financeTransactionsCol, stripDoc } from "../_lib/mongo.js";
import type {
  FinanceTransaction,
  FinanceTransactionType,
} from "../_lib/types.js";

const INCOME_CATEGORIES = new Set([
  "salary",
  "bonus",
  "business",
  "other_income",
]);
const EXPENSE_CATEGORIES = new Set([
  "housing",
  "food",
  "transport",
  "family",
  "shopping",
  "bills",
  "electricity",
  "water",
  "wifi",
  "entertainment",
  "health",
  "other_expense",
]);

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateBody(body: {
  type?: string;
  category?: string;
  amount?: number;
  date?: string;
  description?: string;
  note?: string;
  paymentMethod?: string;
}): {
  type: FinanceTransactionType;
  category: string;
  amount: number;
  date: string;
  description: string;
  note?: string;
  paymentMethod?: string;
} {
  const type = body.type === "income" || body.type === "expense" ? body.type : null;
  if (!type) {
    throw new Error("Loại giao dịch không hợp lệ");
  }
  const category = (body.category ?? "").trim();
  const allowed = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!category || !allowed.has(category)) {
    throw new Error("Danh mục không hợp lệ");
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error("Số tiền phải là số nguyên lớn hơn 0");
  }
  const date = (body.date ?? "").trim();
  if (!isValidDate(date)) {
    throw new Error("Ngày không hợp lệ");
  }
  const description = (body.description ?? "").trim();
  if (!description) {
    throw new Error("Vui lòng nhập nội dung");
  }
  return {
    type,
    category,
    amount,
    date,
    description,
    note: body.note?.trim() || undefined,
    paymentMethod: body.paymentMethod?.trim() || undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const col = await financeTransactionsCol();

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FINANCE_TRANSACTION_VIEW))) return;
      const month =
        typeof req.query.month === "string" ? req.query.month : undefined;
      const from =
        typeof req.query.from === "string" ? req.query.from : undefined;
      const to = typeof req.query.to === "string" ? req.query.to : undefined;

      const filter: Record<string, unknown> = {};
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        filter.date = {
          $gte: `${month}-01`,
          $lte: `${month}-31`,
        };
      } else if (from || to) {
        filter.date = {};
        if (from && isValidDate(from)) {
          (filter.date as Record<string, string>).$gte = from;
        }
        if (to && isValidDate(to)) {
          (filter.date as Record<string, string>).$lte = to;
        }
      }

      const rows = await col.find(filter).sort({ date: -1, createdAt: -1 }).toArray();
      res.status(200).json(rows.map((r) => stripDoc(r)));
      return;
    }

    if (req.method === "POST") {
      if (!(await requirePermission(req, res, PERMISSIONS.FINANCE_TRANSACTION_CREATE))) return;
      const body = readJsonBody<{
        type?: string;
        category?: string;
        amount?: number;
        date?: string;
        description?: string;
        note?: string;
        paymentMethod?: string;
      }>(req);
      const parsed = validateBody(body);
      const now = new Date().toISOString();
      const id = randomUUID();
      const row: FinanceTransaction = {
        _id: id,
        id,
        ...parsed,
        createdAt: now,
        updatedAt: now,
      };
      await col.insertOne(row);
      res.status(201).json(stripDoc(row));
      return;
    }

    if (req.method === "PATCH") {
      if (!(await requirePermission(req, res, PERMISSIONS.FINANCE_TRANSACTION_UPDATE))) return;
      const id = typeof req.query.id === "string" ? req.query.id : "";
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      const body = readJsonBody<{
        type?: string;
        category?: string;
        amount?: number;
        date?: string;
        description?: string;
        note?: string;
        paymentMethod?: string;
      }>(req);
      const parsed = validateBody(body);
      const result = await col.findOneAndUpdate(
        { id },
        {
          $set: {
            ...parsed,
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" },
      );
      if (!result) {
        res.status(404).json({ error: "Không tìm thấy giao dịch" });
        return;
      }
      res.status(200).json(stripDoc(result));
      return;
    }

    if (req.method === "DELETE") {
      if (!(await requirePermission(req, res, PERMISSIONS.FINANCE_TRANSACTION_DELETE))) return;
      const id = typeof req.query.id === "string" ? req.query.id : "";
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      const result = await col.deleteOne({ id });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: "Không tìm thấy giao dịch" });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE"]);
  });
}

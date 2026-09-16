import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../_lib/http.js";
import {
  borrowersCol,
  loansCol,
  schedulesCol,
  stripDoc,
  transactionsCol,
} from "../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requirePermission(req, res, req.method === "GET" ? PERMISSIONS.LOAN_LOAN_VIEW : req.method === "DELETE" ? PERMISSIONS.LOAN_LOAN_DELETE : PERMISSIONS.LOAN_LOAN_UPDATE))) return;
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    const loans = await loansCol();

    if (req.method === "GET") {
      const loan = await loans.findOne({ id });
      if (!loan) {
        res.status(404).json({ error: "Không tìm thấy khoản vay" });
        return;
      }
      const [borrower, transactions, schedules] = await Promise.all([
        (await borrowersCol()).findOne({ id: loan.borrowerId }),
        (await transactionsCol())
          .find({ loanId: id })
          .sort({ transactionDate: -1 })
          .toArray(),
        (await schedulesCol())
          .find({ loanId: id })
          .sort({ dueDate: 1 })
          .toArray(),
      ]);
      res.status(200).json({
        loan: stripDoc(loan),
        borrower: borrower ? stripDoc(borrower) : null,
        transactions: transactions.map((t) => stripDoc(t)),
        schedules: schedules.map((s) => stripDoc(s)),
      });
      return;
    }

    if (req.method === "PATCH") {
      const body = readJsonBody<{ status?: "CANCELLED" | "COMPLETED" }>(req);
      if (body.status !== "CANCELLED" && body.status !== "COMPLETED") {
        res.status(400).json({ error: "Trạng thái không hợp lệ" });
        return;
      }
      const result = await loans.findOneAndUpdate(
        { id },
        { $set: { status: body.status, updatedAt: new Date().toISOString() } },
        { returnDocument: "after" },
      );
      if (!result) {
        res.status(404).json({ error: "Không tìm thấy khoản vay" });
        return;
      }
      res.status(200).json(stripDoc(result));
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH"]);
  });
}

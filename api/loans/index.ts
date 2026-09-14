import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../_lib/auth.js";
import {
  generateInterestSchedules,
} from "../_lib/calculations.js";
import { dateInputToISO } from "../_lib/date.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../_lib/http.js";
import {
  loansCol,
  schedulesCol,
  stripDoc,
  transactionsCol,
} from "../_lib/mongo.js";
import type { Loan, Transaction } from "../_lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;
    const loans = await loansCol();

    if (req.method === "GET") {
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const filter =
        status && status !== "ALL" ? { status: status as Loan["status"] } : {};
      const rows = await loans.find(filter).sort({ createdAt: -1 }).toArray();
      res.status(200).json(rows.map((r) => stripDoc(r)));
      return;
    }

    if (req.method === "POST") {
      const body = readJsonBody<{
        borrowerId?: string;
        principalAmount?: number;
        monthlyInterestAmount?: number;
        startDate?: string;
        note?: string;
      }>(req);

      if (!body.borrowerId) {
        res.status(400).json({ error: "Vui lòng chọn người vay" });
        return;
      }
      if (!body.principalAmount || body.principalAmount <= 0) {
        res.status(400).json({ error: "Số tiền gốc phải lớn hơn 0" });
        return;
      }
      if (!body.monthlyInterestAmount || body.monthlyInterestAmount <= 0) {
        res.status(400).json({ error: "Tiền lời hàng tháng phải lớn hơn 0" });
        return;
      }
      if (!body.startDate) {
        res.status(400).json({ error: "Vui lòng chọn ngày bắt đầu" });
        return;
      }

      const now = new Date().toISOString();
      const startDate = dateInputToISO(body.startDate);
      const id = randomUUID();
      const loan: Loan = {
        _id: id,
        id,
        borrowerId: body.borrowerId,
        principalAmount: body.principalAmount,
        monthlyInterestAmount: body.monthlyInterestAmount,
        startDate,
        status: "ACTIVE",
        note: body.note?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const txId = randomUUID();
      const disbursement: Transaction = {
        _id: txId,
        id: txId,
        loanId: loan.id,
        type: "DISBURSEMENT",
        amount: body.principalAmount,
        transactionDate: startDate,
        note: "Giải ngân khoản vay",
        createdAt: now,
      };

      const schedules = generateInterestSchedules(loan, 12).map((s) => ({
        ...s,
        _id: s.id,
      }));

      await loans.insertOne(loan);
      await (await transactionsCol()).insertOne(disbursement);
      if (schedules.length > 0) {
        await (await schedulesCol()).insertMany(schedules);
      }

      res.status(201).json(stripDoc(loan));
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

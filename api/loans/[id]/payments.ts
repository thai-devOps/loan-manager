import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../../../server/lib/auth.js";
import {
  applyInterestPaymentToSchedules,
  getRemainingPrincipal,
  shouldCompleteLoan,
} from "../../../server/lib/calculations.js";
import { dateInputToISO } from "../../../server/lib/date.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../server/lib/http.js";
import {
  loansCol,
  schedulesCol,
  stripDoc,
  transactionsCol,
} from "../../../server/lib/mongo.js";
import type { Transaction } from "../../../server/lib/types.js";

type PaymentBody = {
  paymentType?: "INTEREST_PAYMENT" | "PRINCIPAL_PAYMENT" | "BOTH";
  amount?: number;
  interestAmount?: number;
  principalAmount?: number;
  transactionDate?: string;
  note?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }

    const loanId = req.query.id;
    if (typeof loanId !== "string" || !loanId) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    const body = readJsonBody<PaymentBody>(req);
    const transactionDate = body.transactionDate;
    if (!transactionDate) {
      res.status(400).json({ error: "Vui lòng chọn ngày thu" });
      return;
    }

    const loans = await loansCol();
    const loan = await loans.findOne({ id: loanId });
    if (!loan) {
      res.status(404).json({ error: "Không tìm thấy khoản vay" });
      return;
    }

    const type = body.paymentType ?? "INTEREST_PAYMENT";

    if (type === "BOTH") {
      const interest = body.interestAmount ?? 0;
      const principal = body.principalAmount ?? 0;
      if (interest <= 0 && principal <= 0) {
        res.status(400).json({
          error: "Cần nhập ít nhất một trong hai: gốc hoặc lời",
        });
        return;
      }
    }

    if (type === "PRINCIPAL_PAYMENT" || type === "BOTH") {
      const amount =
        type === "BOTH"
          ? (body.principalAmount ?? 0)
          : (body.amount ?? body.principalAmount ?? 0);
      if (type === "PRINCIPAL_PAYMENT" && amount <= 0) {
        res.status(400).json({ error: "Số tiền gốc phải lớn hơn 0" });
        return;
      }
      if (amount > 0) {
        await recordPrincipal(loanId, amount, transactionDate, body.note);
      }
    }

    if (type === "INTEREST_PAYMENT" || type === "BOTH") {
      const amount =
        type === "BOTH"
          ? (body.interestAmount ?? 0)
          : (body.amount ?? body.interestAmount ?? 0);
      if (type === "INTEREST_PAYMENT" && amount <= 0) {
        res.status(400).json({ error: "Số tiền lời phải lớn hơn 0" });
        return;
      }
      if (amount > 0) {
        await recordInterest(loanId, amount, transactionDate, body.note);
      }
    }

    const updated = await loans.findOne({ id: loanId });
    res.status(200).json({ ok: true, loan: updated ? stripDoc(updated) : null });
  });
}

async function recordPrincipal(
  loanId: string,
  amount: number,
  transactionDate: string,
  note?: string,
) {
  const loans = await loansCol();
  const txsCol = await transactionsCol();
  const loan = await loans.findOne({ id: loanId });
  if (!loan) throw new Error("Không tìm thấy khoản vay");
  if (loan.status === "CANCELLED") throw new Error("Khoản vay đã bị hủy");

  const txs = await txsCol.find({ loanId }).toArray();
  const remaining = getRemainingPrincipal(loan.principalAmount, txs);
  if (amount <= 0) throw new Error("Số tiền gốc phải lớn hơn 0");
  if (amount > remaining) {
    throw new Error("Số tiền gốc không được vượt quá dư nợ hiện tại");
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const transaction: Transaction = {
    _id: id,
    id,
    loanId,
    type: "PRINCIPAL_PAYMENT",
    amount,
    transactionDate: dateInputToISO(transactionDate),
    note: note?.trim() || undefined,
    createdAt: now,
  };

  const newRemaining = remaining - amount;
  const updates: { updatedAt: string; status?: "COMPLETED" } = {
    updatedAt: now,
  };
  if (shouldCompleteLoan(newRemaining) && loan.status === "ACTIVE") {
    updates.status = "COMPLETED";
  }

  await txsCol.insertOne(transaction);
  await loans.updateOne({ id: loanId }, { $set: updates });
}

async function recordInterest(
  loanId: string,
  amount: number,
  transactionDate: string,
  note?: string,
) {
  const loans = await loansCol();
  const txsCol = await transactionsCol();
  const schedCol = await schedulesCol();
  const loan = await loans.findOne({ id: loanId });
  if (!loan) throw new Error("Không tìm thấy khoản vay");
  if (amount <= 0) throw new Error("Số tiền lời phải lớn hơn 0");

  const now = new Date().toISOString();
  const schedules = await schedCol.find({ loanId }).toArray();
  const updated = applyInterestPaymentToSchedules(schedules, amount);

  const id = randomUUID();
  const transaction: Transaction = {
    _id: id,
    id,
    loanId,
    type: "INTEREST_PAYMENT",
    amount,
    transactionDate: dateInputToISO(transactionDate),
    note: note?.trim() || undefined,
    createdAt: now,
  };

  await txsCol.insertOne(transaction);
  for (const s of updated) {
    await schedCol.updateOne(
      { id: s.id },
      { $set: { paidAmount: s.paidAmount, status: s.status } },
    );
  }
  await loans.updateOne({ id: loanId }, { $set: { updatedAt: now } });
}

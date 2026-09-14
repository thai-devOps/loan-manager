import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../../server/lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../server/lib/http.js";
import {
  borrowersCol,
  loansCol,
  schedulesCol,
  stripDoc,
  transactionsCol,
} from "../../server/lib/mongo.js";
import type {
  Borrower,
  InterestSchedule,
  Loan,
  Transaction,
} from "../../server/lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;

    if (req.method === "GET") {
      const [borrowers, loans, interestSchedules, transactions] =
        await Promise.all([
          (await borrowersCol()).find({}).toArray(),
          (await loansCol()).find({}).toArray(),
          (await schedulesCol()).find({}).toArray(),
          (await transactionsCol()).find({}).toArray(),
        ]);
      res.status(200).json({
        version: 1,
        exportedAt: new Date().toISOString(),
        borrowers: borrowers.map((b) => stripDoc(b)),
        loans: loans.map((l) => stripDoc(l)),
        interestSchedules: interestSchedules.map((s) => stripDoc(s)),
        transactions: transactions.map((t) => stripDoc(t)),
      });
      return;
    }

    if (req.method === "POST") {
      const body = readJsonBody<{
        borrowers?: Borrower[];
        loans?: Loan[];
        interestSchedules?: InterestSchedule[];
        transactions?: Transaction[];
      }>(req);

      if (
        !Array.isArray(body.borrowers) ||
        !Array.isArray(body.loans) ||
        !Array.isArray(body.interestSchedules) ||
        !Array.isArray(body.transactions)
      ) {
        res.status(400).json({ error: "Dữ liệu backup không hợp lệ" });
        return;
      }

      await Promise.all([
        (await borrowersCol()).deleteMany({}),
        (await loansCol()).deleteMany({}),
        (await schedulesCol()).deleteMany({}),
        (await transactionsCol()).deleteMany({}),
      ]);

      if (body.borrowers.length) {
        await (await borrowersCol()).insertMany(
          body.borrowers.map((b) => ({ ...b, _id: b.id })),
        );
      }
      if (body.loans.length) {
        await (await loansCol()).insertMany(
          body.loans.map((l) => ({ ...l, _id: l.id })),
        );
      }
      if (body.interestSchedules.length) {
        await (await schedulesCol()).insertMany(
          body.interestSchedules.map((s) => ({ ...s, _id: s.id })),
        );
      }
      if (body.transactions.length) {
        await (await transactionsCol()).insertMany(
          body.transactions.map((t) => ({ ...t, _id: t.id })),
        );
      }

      res.status(200).json({ ok: true });
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { addMonths, subMonths } from "date-fns";
import { PERMISSIONS } from "../_lib/access/catalog.js";
import { requirePermission } from "../_lib/auth.js";
import { generateInterestSchedules } from "../_lib/calculations.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../_lib/http.js";
import {
  assetSettingsCol,
  assetSnapshotsCol,
  assetsCol,
  borrowersCol,
  financeTransactionsCol,
  goldPlansCol,
  goldPurchasesCol,
  loansCol,
  schedulesCol,
  stripDoc,
  transactionsCol,
} from "../_lib/mongo.js";
import type {
  Borrower,
  InterestSchedule,
  Loan,
  Transaction,
} from "../_lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requirePermission(req, res, PERMISSIONS.SETTINGS_UPDATE))) return;

    const action = req.query.action;
    if (typeof action !== "string" || !action) {
      res.status(400).json({ error: "Missing action" });
      return;
    }

    if (action === "seed") {
      await handleSeed(req, res);
      return;
    }
    if (action === "reset") {
      await handleReset(req, res);
      return;
    }
    if (action === "backup") {
      await handleBackup(req, res);
      return;
    }

    res.status(404).json({ error: "Unknown admin action" });
  });
}

async function handleSeed(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  const force =
    typeof req.query.force === "string" && req.query.force === "1";
  const bCol = await borrowersCol();
  const count = await bCol.countDocuments();
  if (count > 0 && !force) {
    res.status(409).json({
      error: "Database đã có dữ liệu. Dùng force=1 để ghi đè seed.",
    });
    return;
  }

  if (force) {
    await clearAll();
  }

  const now = new Date().toISOString();
  const startA = subMonths(new Date(), 3);
  const startB = subMonths(new Date(), 1);
  const startC = new Date();

  const borrowers: Borrower[] = [
    {
      id: randomUUID(),
      name: "Nguyễn Văn A",
      phone: "0901234567",
      identityNumber: "079085001234",
      address: "Quận 1, TP.HCM",
      note: "Khách quen",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      name: "Trần Văn B",
      phone: "0912345678",
      identityNumber: "079090005678",
      address: "Quận 3, TP.HCM",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      name: "Lê Văn C",
      phone: "0987654321",
      address: "Bình Thạnh, TP.HCM",
      createdAt: now,
      updatedAt: now,
    },
  ].map((b) => ({ ...b, _id: b.id }));

  const loanA: Loan = {
    _id: randomUUID(),
    id: "",
    borrowerId: borrowers[0].id,
    principalAmount: 100_000_000,
    monthlyInterestAmount: 3_000_000,
    startDate: startA.toISOString(),
    status: "ACTIVE",
    note: "Cho vay kinh doanh",
    createdAt: now,
    updatedAt: now,
  };
  loanA.id = loanA._id as string;

  const loanB: Loan = {
    _id: randomUUID(),
    id: "",
    borrowerId: borrowers[1].id,
    principalAmount: 50_000_000,
    monthlyInterestAmount: 1_500_000,
    startDate: startB.toISOString(),
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  loanB.id = loanB._id as string;

  const loanC: Loan = {
    _id: randomUUID(),
    id: "",
    borrowerId: borrowers[2].id,
    principalAmount: 20_000_000,
    monthlyInterestAmount: 600_000,
    startDate: startC.toISOString(),
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  loanC.id = loanC._id as string;

  const mkTx = (
    loanId: string,
    type: Transaction["type"],
    amount: number,
    date: string,
    note?: string,
  ): Transaction => {
    const id = randomUUID();
    return {
      _id: id,
      id,
      loanId,
      type,
      amount,
      transactionDate: date,
      note,
      createdAt: now,
    };
  };

  const transactions: Transaction[] = [
    mkTx(loanA.id, "DISBURSEMENT", loanA.principalAmount, loanA.startDate, "Giải ngân ban đầu"),
    mkTx(loanA.id, "INTEREST_PAYMENT", 3_000_000, addMonths(startA, 1).toISOString(), "Thu lời kỳ 1"),
    mkTx(loanA.id, "INTEREST_PAYMENT", 3_000_000, addMonths(startA, 2).toISOString(), "Thu lời kỳ 2"),
    mkTx(loanA.id, "PRINCIPAL_PAYMENT", 20_000_000, addMonths(startA, 2).toISOString(), "Trả một phần gốc"),
    mkTx(loanB.id, "DISBURSEMENT", loanB.principalAmount, loanB.startDate),
    mkTx(loanB.id, "INTEREST_PAYMENT", 1_500_000, addMonths(startB, 1).toISOString(), "Thu lời kỳ đầu"),
    mkTx(loanC.id, "DISBURSEMENT", loanC.principalAmount, loanC.startDate),
  ];

  const schedulesA = generateInterestSchedules(loanA, 12);
  if (schedulesA[0]) {
    schedulesA[0].paidAmount = schedulesA[0].amount;
    schedulesA[0].status = "PAID";
  }
  if (schedulesA[1]) {
    schedulesA[1].paidAmount = schedulesA[1].amount;
    schedulesA[1].status = "PAID";
  }
  const schedulesB = generateInterestSchedules(loanB, 12);
  if (schedulesB[0]) {
    schedulesB[0].paidAmount = schedulesB[0].amount;
    schedulesB[0].status = "PAID";
  }
  const schedulesC = generateInterestSchedules(loanC, 12);
  const schedules = [...schedulesA, ...schedulesB, ...schedulesC].map(
    (s) => ({ ...s, _id: s.id }),
  );

  await bCol.insertMany(borrowers);
  await (await loansCol()).insertMany([loanA, loanB, loanC]);
  await (await transactionsCol()).insertMany(transactions);
  await (await schedulesCol()).insertMany(schedules);

  res.status(200).json({ ok: true, seeded: true });
}

async function handleReset(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }
  await clearAll();
  res.status(200).json({ ok: true });
}

async function handleBackup(req: VercelRequest, res: VercelResponse) {
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

    await clearAll();

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
}

async function clearAll() {
  await Promise.all([
    (await borrowersCol()).deleteMany({}),
    (await loansCol()).deleteMany({}),
    (await transactionsCol()).deleteMany({}),
    (await schedulesCol()).deleteMany({}),
    (await financeTransactionsCol()).deleteMany({}),
    (await assetsCol()).deleteMany({}),
    (await goldPurchasesCol()).deleteMany({}),
    (await goldPlansCol()).deleteMany({}),
    (await assetSettingsCol()).deleteMany({}),
    (await assetSnapshotsCol()).deleteMany({}),
  ]);
}

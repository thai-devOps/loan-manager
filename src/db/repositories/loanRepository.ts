import { getDb } from "@/db/database";
import {
  enqueueAndKick,
  isActiveRecord,
  newId,
  nowIso,
} from "@/db/repositories/baseRepository";
import type {
  LocalInterestSchedule,
  LocalLoan,
  LocalLoanTransaction,
} from "@/db/schema";
import {
  applyInterestPaymentToSchedules,
  generateInterestSchedules,
  getRemainingPrincipal,
  shouldCompleteLoan,
} from "@/lib/calculations";
import type { LoanFormValues } from "@/schemas/loan.schema";
import type { InterestSchedule } from "@/types/interest-schedule";
import type { Loan } from "@/types/loan";
import type { Transaction } from "@/types/transaction";
import type { Borrower } from "@/types/borrower";

function stripMeta<T extends { deletedAt?: string | null }>(
  row: T,
): Omit<T, "deletedAt"> {
  const { deletedAt: _d, ...rest } = row;
  void _d;
  return rest;
}

export const loanRepository = {
  async list(status?: string): Promise<Loan[]> {
    let rows = await getDb().loans.toArray();
    rows = rows.filter(isActiveRecord);
    if (status && status !== "ALL") {
      rows = rows.filter((r) => r.status === status);
    }
    return rows
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => stripMeta(r) as Loan);
  },

  async get(id: string): Promise<Loan | undefined> {
    const row = await getDb().loans.get(id);
    if (!row || !isActiveRecord(row)) return undefined;
    return stripMeta(row) as Loan;
  },

  async getDetail(id: string): Promise<{
    loan: Loan;
    borrower: Borrower | null;
    transactions: Transaction[];
    schedules: InterestSchedule[];
  } | null> {
    const loan = await this.get(id);
    if (!loan) return null;
    const borrowerRow = await getDb().borrowers.get(loan.borrowerId);
    const borrower =
      borrowerRow && isActiveRecord(borrowerRow)
        ? (stripMeta(borrowerRow) as Borrower)
        : null;
    const transactions = await this.listTransactions(id);
    const schedules = await this.listSchedules(id);
    return { loan, borrower, transactions, schedules };
  },

  async listTransactions(loanId?: string): Promise<Transaction[]> {
    const db = getDb();
    const rows = loanId
      ? await db.loanTransactions.where("loanId").equals(loanId).toArray()
      : await db.loanTransactions.toArray();
    return rows
      .filter(isActiveRecord)
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
      .map((r) => stripMeta(r) as Transaction);
  },

  async listSchedules(loanId?: string): Promise<InterestSchedule[]> {
    const db = getDb();
    const rows = loanId
      ? await db.interestSchedules.where("loanId").equals(loanId).toArray()
      : await db.interestSchedules.toArray();
    return rows.filter(isActiveRecord).map((r) => stripMeta(r) as InterestSchedule);
  },

  async create(values: LoanFormValues): Promise<Loan> {
    const now = nowIso();
    const id = newId();
    const loan: LocalLoan = {
      id,
      borrowerId: values.borrowerId,
      principalAmount: values.principalAmount,
      monthlyInterestAmount: values.monthlyInterestAmount,
      startDate: values.startDate,
      status: "ACTIVE",
      note: values.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const txId = newId();
    const disbursement: LocalLoanTransaction = {
      id: txId,
      loanId: id,
      type: "DISBURSEMENT",
      amount: values.principalAmount,
      transactionDate: values.startDate,
      note: "Giải ngân khoản vay",
      createdAt: now,
      deletedAt: null,
    };

    const schedules: LocalInterestSchedule[] = generateInterestSchedules(
      loan,
      12,
    ).map((s) => ({ ...s, deletedAt: null }));

    const db = getDb();
    await db.transaction(
      "rw",
      db.loans,
      db.loanTransactions,
      db.interestSchedules,
      db.syncQueue,
      async () => {
        await db.loans.put(loan);
        await db.loanTransactions.put(disbursement);
        if (schedules.length) await db.interestSchedules.bulkPut(schedules);
      },
    );

    // Single server POST creates loan + disbursement + schedules
    await enqueueAndKick({
      entity: "loan",
      entityId: id,
      action: "create",
      payload: {
        borrowerId: loan.borrowerId,
        principalAmount: loan.principalAmount,
        monthlyInterestAmount: loan.monthlyInterestAmount,
        startDate: loan.startDate,
        note: loan.note,
      },
    });

    return stripMeta(loan) as Loan;
  },

  async cancel(loanId: string): Promise<Loan> {
    const existing = await getDb().loans.get(loanId);
    if (!existing || !isActiveRecord(existing)) {
      throw new Error("Không tìm thấy khoản vay");
    }
    const row: LocalLoan = {
      ...existing,
      status: "CANCELLED",
      updatedAt: nowIso(),
    };
    await getDb().loans.put(row);
    await enqueueAndKick({
      entity: "loan",
      entityId: loanId,
      action: "update",
      payload: { status: "CANCELLED" },
    });
    return stripMeta(row) as Loan;
  },

  async recordPayment(params: {
    loanId: string;
    paymentType: "INTEREST_PAYMENT" | "PRINCIPAL_PAYMENT" | "BOTH";
    amount?: number;
    interestAmount?: number;
    principalAmount?: number;
    transactionDate: string;
    note?: string;
  }): Promise<void> {
    const db = getDb();
    const loan = await db.loans.get(params.loanId);
    if (!loan || !isActiveRecord(loan)) {
      throw new Error("Không tìm thấy khoản vay");
    }

    const opId = newId();
    const now = nowIso();
    const txs: LocalLoanTransaction[] = [];
    let schedules = (
      await db.interestSchedules.where("loanId").equals(params.loanId).toArray()
    ).filter(isActiveRecord);

    const interestAmount =
      params.paymentType === "BOTH"
        ? (params.interestAmount ?? 0)
        : params.paymentType === "INTEREST_PAYMENT"
          ? (params.amount ?? params.interestAmount ?? 0)
          : 0;
    const principalAmount =
      params.paymentType === "BOTH"
        ? (params.principalAmount ?? 0)
        : params.paymentType === "PRINCIPAL_PAYMENT"
          ? (params.amount ?? params.principalAmount ?? 0)
          : 0;

    if (interestAmount > 0) {
      txs.push({
        id: newId(),
        loanId: params.loanId,
        type: "INTEREST_PAYMENT",
        amount: interestAmount,
        transactionDate: params.transactionDate,
        note: params.note,
        createdAt: now,
        deletedAt: null,
      });
      schedules = applyInterestPaymentToSchedules(
        schedules,
        interestAmount,
      ).map((s) => ({ ...s, deletedAt: null }));
    }

    let nextLoan: LocalLoan = { ...loan, updatedAt: now };
    if (principalAmount > 0) {
      const allTx = (
        await db.loanTransactions.where("loanId").equals(params.loanId).toArray()
      ).filter(isActiveRecord);
      const remaining = getRemainingPrincipal(loan.principalAmount, [
        ...allTx.map((t) => stripMeta(t) as Transaction),
        {
          id: "tmp",
          loanId: params.loanId,
          type: "PRINCIPAL_PAYMENT",
          amount: principalAmount,
          transactionDate: params.transactionDate,
          createdAt: now,
        },
      ]);
      if (principalAmount > getRemainingPrincipal(loan.principalAmount, allTx.map((t) => stripMeta(t) as Transaction))) {
        throw new Error("Số tiền gốc vượt quá dư nợ");
      }
      txs.push({
        id: newId(),
        loanId: params.loanId,
        type: "PRINCIPAL_PAYMENT",
        amount: principalAmount,
        transactionDate: params.transactionDate,
        note: params.note,
        createdAt: now,
        deletedAt: null,
      });
      if (shouldCompleteLoan(remaining)) {
        nextLoan = { ...nextLoan, status: "COMPLETED" };
      }
    }

    await db.transaction(
      "rw",
      db.loans,
      db.loanTransactions,
      db.interestSchedules,
      async () => {
        if (txs.length) await db.loanTransactions.bulkPut(txs);
        for (const s of schedules) {
          await db.interestSchedules.put(s);
        }
        await db.loans.put(nextLoan);
      },
    );

    await enqueueAndKick({
      opId,
      entity: "loanPayment",
      entityId: opId,
      action: "create",
      payload: {
        loanId: params.loanId,
        paymentType: params.paymentType,
        amount: params.amount,
        interestAmount: params.interestAmount,
        principalAmount: params.principalAmount,
        transactionDate: params.transactionDate,
        note: params.note,
      },
    });
  },
};

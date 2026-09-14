import { db } from "@/db/database";
import {
  generateInterestSchedules,
  getRemainingPrincipal,
  shouldCompleteLoan,
  applyInterestPaymentToSchedules,
  ensureInterestSchedules,
  refreshScheduleStatuses,
} from "@/lib/calculations";
import { dateInputToISO, toISOString } from "@/lib/date";
import type { LoanFormValues } from "@/schemas/loan.schema";
import type { Loan } from "@/types/loan";
import type { Transaction } from "@/types/transaction";

export async function createLoan(values: LoanFormValues): Promise<Loan> {
  const now = toISOString();
  const startDate = dateInputToISO(values.startDate);

  const loan: Loan = {
    id: crypto.randomUUID(),
    borrowerId: values.borrowerId,
    principalAmount: values.principalAmount,
    monthlyInterestAmount: values.monthlyInterestAmount,
    startDate,
    status: "ACTIVE",
    note: values.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const disbursement: Transaction = {
    id: crypto.randomUUID(),
    loanId: loan.id,
    type: "DISBURSEMENT",
    amount: values.principalAmount,
    transactionDate: startDate,
    note: "Giải ngân khoản vay",
    createdAt: now,
  };

  const schedules = generateInterestSchedules(loan, 12);

  await db.transaction(
    "rw",
    db.loans,
    db.transactions,
    db.interestSchedules,
    async () => {
      await db.loans.add(loan);
      await db.transactions.add(disbursement);
      await db.interestSchedules.bulkAdd(schedules);
    },
  );

  return loan;
}

export async function cancelLoan(loanId: string): Promise<void> {
  await db.loans.update(loanId, {
    status: "CANCELLED",
    updatedAt: toISOString(),
  });
}

export async function getLoanTransactions(loanId: string): Promise<Transaction[]> {
  return db.transactions.where("loanId").equals(loanId).toArray();
}

export async function getLoanRemainingPrincipal(loanId: string): Promise<number> {
  const loan = await db.loans.get(loanId);
  if (!loan) return 0;
  const txs = await getLoanTransactions(loanId);
  return getRemainingPrincipal(loan.principalAmount, txs);
}

export async function recordPrincipalPayment(params: {
  loanId: string;
  amount: number;
  transactionDate: string;
  note?: string;
}): Promise<void> {
  const loan = await db.loans.get(params.loanId);
  if (!loan) {
    throw new Error("Không tìm thấy khoản vay");
  }
  if (loan.status === "CANCELLED") {
    throw new Error("Khoản vay đã bị hủy");
  }

  const txs = await getLoanTransactions(params.loanId);
  const remaining = getRemainingPrincipal(loan.principalAmount, txs);
  if (params.amount <= 0) {
    throw new Error("Số tiền gốc phải lớn hơn 0");
  }
  if (params.amount > remaining) {
    throw new Error("Số tiền gốc không được vượt quá dư nợ hiện tại");
  }

  const now = toISOString();
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    loanId: params.loanId,
    type: "PRINCIPAL_PAYMENT",
    amount: params.amount,
    transactionDate: dateInputToISO(params.transactionDate),
    note: params.note?.trim() || undefined,
    createdAt: now,
  };

  const newRemaining = remaining - params.amount;
  const updates: Partial<Loan> = { updatedAt: now };
  if (shouldCompleteLoan(newRemaining) && loan.status === "ACTIVE") {
    updates.status = "COMPLETED";
  }

  await db.transaction("rw", db.transactions, db.loans, async () => {
    await db.transactions.add(transaction);
    await db.loans.update(params.loanId, updates);
  });
}

export async function recordInterestPayment(params: {
  loanId: string;
  amount: number;
  transactionDate: string;
  note?: string;
}): Promise<void> {
  const loan = await db.loans.get(params.loanId);
  if (!loan) {
    throw new Error("Không tìm thấy khoản vay");
  }
  if (params.amount <= 0) {
    throw new Error("Số tiền lời phải lớn hơn 0");
  }

  const now = toISOString();
  const schedules = await db.interestSchedules
    .where("loanId")
    .equals(params.loanId)
    .toArray();

  const updatedSchedules = applyInterestPaymentToSchedules(
    schedules,
    params.amount,
  );

  const transaction: Transaction = {
    id: crypto.randomUUID(),
    loanId: params.loanId,
    type: "INTEREST_PAYMENT",
    amount: params.amount,
    transactionDate: dateInputToISO(params.transactionDate),
    note: params.note?.trim() || undefined,
    createdAt: now,
  };

  await db.transaction(
    "rw",
    db.transactions,
    db.interestSchedules,
    db.loans,
    async () => {
      await db.transactions.add(transaction);
      await db.interestSchedules.bulkPut(updatedSchedules);
      await db.loans.update(params.loanId, { updatedAt: now });
    },
  );
}

export async function recordCombinedPayment(params: {
  loanId: string;
  principalAmount: number;
  interestAmount: number;
  transactionDate: string;
  note?: string;
}): Promise<void> {
  if (params.principalAmount > 0) {
    await recordPrincipalPayment({
      loanId: params.loanId,
      amount: params.principalAmount,
      transactionDate: params.transactionDate,
      note: params.note ? `${params.note} (gốc)` : "Thu gốc",
    });
  }
  if (params.interestAmount > 0) {
    await recordInterestPayment({
      loanId: params.loanId,
      amount: params.interestAmount,
      transactionDate: params.transactionDate,
      note: params.note ? `${params.note} (lời)` : "Thu lời",
    });
  }
}

/** Extend schedules and refresh OVERDUE statuses for all active loans. */
export async function syncSchedulesForActiveLoans(): Promise<void> {
  const loans = await db.loans.where("status").equals("ACTIVE").toArray();

  for (const loan of loans) {
    const existing = await db.interestSchedules
      .where("loanId")
      .equals(loan.id)
      .toArray();

    const newOnes = ensureInterestSchedules(loan, existing);
    const refreshed = refreshScheduleStatuses([...existing, ...newOnes]);

    await db.transaction("rw", db.interestSchedules, async () => {
      if (newOnes.length > 0) {
        await db.interestSchedules.bulkAdd(newOnes);
      }
      const changed = refreshed.filter((s) => {
        const old = existing.find((e) => e.id === s.id);
        return old && old.status !== s.status;
      });
      if (changed.length > 0) {
        await db.interestSchedules.bulkPut(changed);
      }
    });
  }
}

import { addMonths, subMonths } from "date-fns";
import { db } from "@/db/database";
import { generateInterestSchedules } from "@/lib/calculations";
import { toISOString } from "@/lib/date";
import type { Borrower } from "@/types/borrower";
import type { Loan } from "@/types/loan";
import type { Transaction } from "@/types/transaction";

/**
 * Seed sample data for development/demo.
 * Safe to call only when tables are empty (or after an explicit clear).
 */
export async function seedIfEmpty(): Promise<boolean> {
  const count = await db.borrowers.count();
  if (count > 0) {
    return false;
  }
  await seedDemoData();
  return true;
}

export async function seedDemoData(): Promise<void> {
  const now = toISOString();
  const startA = subMonths(new Date(), 3);
  const startB = subMonths(new Date(), 1);
  const startC = new Date();

  const borrowers: Borrower[] = [
    {
      id: crypto.randomUUID(),
      name: "Nguyễn Văn A",
      phone: "0901234567",
      identityNumber: "079085001234",
      address: "Quận 1, TP.HCM",
      note: "Khách quen",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      name: "Trần Văn B",
      phone: "0912345678",
      identityNumber: "079090005678",
      address: "Quận 3, TP.HCM",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      name: "Lê Văn C",
      phone: "0987654321",
      address: "Bình Thạnh, TP.HCM",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const loanA: Loan = {
    id: crypto.randomUUID(),
    borrowerId: borrowers[0].id,
    principalAmount: 100_000_000,
    monthlyInterestAmount: 3_000_000,
    startDate: startA.toISOString(),
    status: "ACTIVE",
    note: "Cho vay kinh doanh",
    createdAt: now,
    updatedAt: now,
  };

  const loanB: Loan = {
    id: crypto.randomUUID(),
    borrowerId: borrowers[1].id,
    principalAmount: 50_000_000,
    monthlyInterestAmount: 1_500_000,
    startDate: startB.toISOString(),
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  const loanC: Loan = {
    id: crypto.randomUUID(),
    borrowerId: borrowers[2].id,
    principalAmount: 20_000_000,
    monthlyInterestAmount: 600_000,
    startDate: startC.toISOString(),
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  const transactions: Transaction[] = [
    {
      id: crypto.randomUUID(),
      loanId: loanA.id,
      type: "DISBURSEMENT",
      amount: loanA.principalAmount,
      transactionDate: loanA.startDate,
      note: "Giải ngân ban đầu",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      loanId: loanA.id,
      type: "INTEREST_PAYMENT",
      amount: 3_000_000,
      transactionDate: addMonths(startA, 1).toISOString(),
      note: "Thu lời kỳ 1",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      loanId: loanA.id,
      type: "INTEREST_PAYMENT",
      amount: 3_000_000,
      transactionDate: addMonths(startA, 2).toISOString(),
      note: "Thu lời kỳ 2",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      loanId: loanA.id,
      type: "PRINCIPAL_PAYMENT",
      amount: 20_000_000,
      transactionDate: addMonths(startA, 2).toISOString(),
      note: "Trả một phần gốc",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      loanId: loanB.id,
      type: "DISBURSEMENT",
      amount: loanB.principalAmount,
      transactionDate: loanB.startDate,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      loanId: loanB.id,
      type: "INTEREST_PAYMENT",
      amount: 1_500_000,
      transactionDate: addMonths(startB, 1).toISOString(),
      note: "Thu lời kỳ đầu",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      loanId: loanC.id,
      type: "DISBURSEMENT",
      amount: loanC.principalAmount,
      transactionDate: loanC.startDate,
      createdAt: now,
    },
  ];

  const schedulesA = generateInterestSchedules(loanA, 12);
  // Mark first two periods as paid for loan A
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

  await db.transaction(
    "rw",
    db.borrowers,
    db.loans,
    db.transactions,
    db.interestSchedules,
    async () => {
      await db.borrowers.bulkAdd(borrowers);
      await db.loans.bulkAdd([loanA, loanB, loanC]);
      await db.transactions.bulkAdd(transactions);
      await db.interestSchedules.bulkAdd([
        ...schedulesA,
        ...schedulesB,
        ...schedulesC,
      ]);
    },
  );
}

export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    db.borrowers,
    db.loans,
    db.transactions,
    db.interestSchedules,
    async () => {
      await Promise.all([
        db.borrowers.clear(),
        db.loans.clear(),
        db.transactions.clear(),
        db.interestSchedules.clear(),
      ]);
    },
  );
}

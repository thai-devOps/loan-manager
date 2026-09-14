import { z } from "zod";
import { db } from "@/db/database";
import type { Borrower } from "@/types/borrower";
import type { Loan } from "@/types/loan";
import type { InterestSchedule } from "@/types/interest-schedule";
import type { Transaction } from "@/types/transaction";

const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  borrowers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      phone: z.string().optional(),
      identityNumber: z.string().optional(),
      address: z.string().optional(),
      note: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  loans: z.array(
    z.object({
      id: z.string(),
      borrowerId: z.string(),
      principalAmount: z.number(),
      monthlyInterestAmount: z.number(),
      startDate: z.string(),
      status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]),
      note: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  interestSchedules: z.array(
    z.object({
      id: z.string(),
      loanId: z.string(),
      period: z.string(),
      dueDate: z.string(),
      amount: z.number(),
      paidAmount: z.number(),
      status: z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE"]),
    }),
  ),
  transactions: z.array(
    z.object({
      id: z.string(),
      loanId: z.string(),
      type: z.enum([
        "DISBURSEMENT",
        "INTEREST_PAYMENT",
        "PRINCIPAL_PAYMENT",
      ]),
      amount: z.number(),
      transactionDate: z.string(),
      note: z.string().optional(),
      createdAt: z.string(),
    }),
  ),
});

export type BackupPayload = z.infer<typeof backupSchema>;

export async function exportBackup(): Promise<BackupPayload> {
  const [borrowers, loans, interestSchedules, transactions] = await Promise.all([
    db.borrowers.toArray(),
    db.loans.toArray(),
    db.interestSchedules.toArray(),
    db.transactions.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    borrowers,
    loans,
    interestSchedules,
    transactions,
  };
}

export function downloadBackupJson(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `loan-manager-backup-${payload.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseAndValidateBackup(raw: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("File JSON không hợp lệ");
  }
  const result = backupSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Dữ liệu backup không đúng định dạng Loan Manager");
  }
  return result.data;
}

export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await db.transaction(
    "rw",
    db.borrowers,
    db.loans,
    db.interestSchedules,
    db.transactions,
    async () => {
      await Promise.all([
        db.borrowers.clear(),
        db.loans.clear(),
        db.interestSchedules.clear(),
        db.transactions.clear(),
      ]);
      await db.borrowers.bulkAdd(payload.borrowers as Borrower[]);
      await db.loans.bulkAdd(payload.loans as Loan[]);
      await db.interestSchedules.bulkAdd(
        payload.interestSchedules as InterestSchedule[],
      );
      await db.transactions.bulkAdd(payload.transactions as Transaction[]);
    },
  );
}

export async function getDatabaseStats() {
  const [borrowers, loans, transactions, schedules] = await Promise.all([
    db.borrowers.count(),
    db.loans.count(),
    db.transactions.count(),
    db.interestSchedules.count(),
  ]);
  return { borrowers, loans, transactions, schedules };
}

export async function resetDatabase(): Promise<void> {
  await db.transaction(
    "rw",
    db.borrowers,
    db.loans,
    db.interestSchedules,
    db.transactions,
    async () => {
      await Promise.all([
        db.borrowers.clear(),
        db.loans.clear(),
        db.interestSchedules.clear(),
        db.transactions.clear(),
      ]);
    },
  );
}

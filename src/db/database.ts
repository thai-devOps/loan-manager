import Dexie, { type EntityTable } from "dexie";
import type { Borrower } from "@/types/borrower";
import type { Loan } from "@/types/loan";
import type { InterestSchedule } from "@/types/interest-schedule";
import type { Transaction } from "@/types/transaction";

export class LoanManagerDB extends Dexie {
  borrowers!: EntityTable<Borrower, "id">;
  loans!: EntityTable<Loan, "id">;
  interestSchedules!: EntityTable<InterestSchedule, "id">;
  transactions!: EntityTable<Transaction, "id">;

  constructor() {
    super("LoanManagerDB");

    this.version(1).stores({
      borrowers: "id, name, phone",
      loans: "id, borrowerId, status",
      interestSchedules: "id, loanId, dueDate, status",
      transactions: "id, loanId, type, transactionDate",
    });
  }
}

export const db = new LoanManagerDB();

export type LoanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Borrower {
  _id?: string;
  id: string;
  name: string;
  phone?: string;
  identityNumber?: string;
  address?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  _id?: string;
  id: string;
  borrowerId: string;
  principalAmount: number;
  monthlyInterestAmount: number;
  startDate: string;
  status: LoanStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | "DISBURSEMENT"
  | "INTEREST_PAYMENT"
  | "PRINCIPAL_PAYMENT";

export interface Transaction {
  _id?: string;
  id: string;
  loanId: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  note?: string;
  createdAt: string;
}

export type InterestScheduleStatus =
  | "PENDING"
  | "PAID"
  | "PARTIAL"
  | "OVERDUE";

export interface InterestSchedule {
  _id?: string;
  id: string;
  loanId: string;
  period: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InterestScheduleStatus;
}

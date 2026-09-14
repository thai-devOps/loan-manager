export type TransactionType =
  | "DISBURSEMENT"
  | "INTEREST_PAYMENT"
  | "PRINCIPAL_PAYMENT";

export interface Transaction {
  id: string;
  loanId: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  note?: string;
  createdAt: string;
}

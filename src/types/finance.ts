export type FinanceTransactionType = "income" | "expense";

export type FinanceCategory = string;

export interface FinanceCategoryRecord {
  id: string;
  key: string;
  name: string;
  description?: string;
  type: FinanceTransactionType;
  icon: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTransaction {
  _id?: string;
  id: string;
  type: FinanceTransactionType;
  category: FinanceCategory;
  amount: number;
  date: string;
  description: string;
  note?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

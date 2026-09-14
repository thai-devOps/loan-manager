export type FinanceTransactionType = "income" | "expense";

export type FinanceIncomeCategory =
  | "salary"
  | "bonus"
  | "business"
  | "other_income";

export type FinanceExpenseCategory =
  | "housing"
  | "food"
  | "transport"
  | "family"
  | "shopping"
  | "bills"
  | "electricity"
  | "water"
  | "wifi"
  | "entertainment"
  | "health"
  | "other_expense";

export type FinanceCategory = FinanceIncomeCategory | FinanceExpenseCategory;

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

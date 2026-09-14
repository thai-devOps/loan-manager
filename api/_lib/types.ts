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

export type FinanceTransactionType = "income" | "expense";

export type FinanceCategory = string;

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

export type ManualAssetType = "cash" | "bank" | "wallet" | "gold" | "other";

export type GoldType = "9999" | "18k" | "other";

export interface ManualAssetGoldDetails {
  goldType: GoldType;
  quantityInPhan: number;
  purchasePricePerChi: number;
  totalCost: number;
  seller?: string;
}

export interface ManualAsset {
  _id?: string;
  id: string;
  name: string;
  type: ManualAssetType;
  value: number;
  valuationDate: string;
  note?: string;
  goldDetails?: ManualAssetGoldDetails;
  createdAt: string;
  updatedAt: string;
}

export interface GoldPurchase {
  _id?: string;
  id: string;
  type: GoldType;
  /** Integer: 1 chỉ = 10 phân, 1 cây = 100 phân */
  quantityInPhan: number;
  purchasePricePerChi: number;
  totalCost: number;
  purchaseDate: string;
  seller?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoldPlan {
  _id?: string;
  id: string;
  targetAmount: number;
  monthlyBudget: number;
  plannedPurchaseDay: number;
  startMonth: string;
  endMonth: string;
  status: "active" | "paused" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface AssetSettings {
  _id?: string;
  id: string;
  goldReferencePricePerChi: {
    "9999": number;
    "18k": number;
    other: number;
  };
  allocationTargets?: {
    lending: number;
    reserve: number;
    gold: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AssetSnapshot {
  _id?: string;
  id: string;
  month: string;
  totalAssets: number;
  lentCapital: number;
  availableCash: number;
  otherAssets: number;
  goldValue: number;
  createdAt: string;
  updatedAt: string;
}

export type LoanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Loan {
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

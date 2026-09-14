export type InterestScheduleStatus =
  | "PENDING"
  | "PAID"
  | "PARTIAL"
  | "OVERDUE";

export interface InterestSchedule {
  id: string;
  loanId: string;
  /** Period key in yyyy-MM format */
  period: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InterestScheduleStatus;
}

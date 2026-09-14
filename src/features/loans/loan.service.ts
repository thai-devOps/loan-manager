import {
  cancelLoan as apiCancel,
  createLoan as apiCreate,
  recordPayment,
  syncSchedules,
} from "@/api/endpoints";
import type { LoanFormValues } from "@/schemas/loan.schema";
import type { Loan } from "@/types/loan";

export async function createLoan(values: LoanFormValues): Promise<Loan> {
  return apiCreate(values);
}

export async function cancelLoan(loanId: string): Promise<void> {
  await apiCancel(loanId);
}

export async function recordPrincipalPayment(params: {
  loanId: string;
  amount: number;
  transactionDate: string;
  note?: string;
}): Promise<void> {
  await recordPayment(params.loanId, {
    paymentType: "PRINCIPAL_PAYMENT",
    amount: params.amount,
    transactionDate: params.transactionDate,
    note: params.note,
  });
}

export async function recordInterestPayment(params: {
  loanId: string;
  amount: number;
  transactionDate: string;
  note?: string;
}): Promise<void> {
  await recordPayment(params.loanId, {
    paymentType: "INTEREST_PAYMENT",
    amount: params.amount,
    transactionDate: params.transactionDate,
    note: params.note,
  });
}

export async function recordCombinedPayment(params: {
  loanId: string;
  principalAmount: number;
  interestAmount: number;
  transactionDate: string;
  note?: string;
}): Promise<void> {
  await recordPayment(params.loanId, {
    paymentType: "BOTH",
    principalAmount: params.principalAmount,
    interestAmount: params.interestAmount,
    transactionDate: params.transactionDate,
    note: params.note,
  });
}

export async function syncSchedulesForActiveLoans(): Promise<void> {
  await syncSchedules();
}

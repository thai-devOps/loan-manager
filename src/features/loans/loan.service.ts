import { loanRepository } from "@/db/repositories/loanRepository";
import type { LoanFormValues } from "@/schemas/loan.schema";
import type { Loan } from "@/types/loan";

export async function createLoan(values: LoanFormValues): Promise<Loan> {
  return loanRepository.create(values);
}

export async function cancelLoan(loanId: string): Promise<void> {
  await loanRepository.cancel(loanId);
}

export async function recordPrincipalPayment(params: {
  loanId: string;
  amount: number;
  transactionDate: string;
  note?: string;
}): Promise<void> {
  await loanRepository.recordPayment({
    loanId: params.loanId,
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
  await loanRepository.recordPayment({
    loanId: params.loanId,
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
  await loanRepository.recordPayment({
    loanId: params.loanId,
    paymentType: "BOTH",
    principalAmount: params.principalAmount,
    interestAmount: params.interestAmount,
    transactionDate: params.transactionDate,
    note: params.note,
  });
}

/** Schedules are maintained locally; SyncManager pulls server copies when online. */
export async function syncSchedulesForActiveLoans(): Promise<void> {
  // no-op locally — horizon extension happens via POST /api/schedules in useSchedulesQuery
}

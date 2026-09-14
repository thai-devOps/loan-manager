import { apiFetch } from "@/api/client";
import type { FinanceTransaction } from "@/types/finance";
import type { Borrower } from "@/types/borrower";
import type { Loan } from "@/types/loan";
import type { InterestSchedule } from "@/types/interest-schedule";
import type { Transaction } from "@/types/transaction";
import type { BorrowerFormValues } from "@/schemas/borrower.schema";
import type { LoanFormValues } from "@/schemas/loan.schema";

export function fetchBorrowers() {
  return apiFetch<Borrower[]>("/api/borrowers");
}

export function fetchBorrower(id: string) {
  return apiFetch<Borrower>(`/api/borrowers/${id}`);
}

export function createBorrower(values: BorrowerFormValues) {
  return apiFetch<Borrower>("/api/borrowers", {
    method: "POST",
    body: values,
  });
}

export function updateBorrower(id: string, values: BorrowerFormValues) {
  return apiFetch<Borrower>(`/api/borrowers/${id}`, {
    method: "PATCH",
    body: values,
  });
}

export function fetchLoans(status?: string) {
  const q = status && status !== "ALL" ? `?status=${status}` : "";
  return apiFetch<Loan[]>(`/api/loans${q}`);
}

export function createLoan(values: LoanFormValues) {
  return apiFetch<Loan>("/api/loans", {
    method: "POST",
    body: values,
  });
}

export function fetchLoanDetail(id: string) {
  return apiFetch<{
    loan: Loan;
    borrower: Borrower | null;
    transactions: Transaction[];
    schedules: InterestSchedule[];
  }>(`/api/loans/${id}`);
}

export function cancelLoan(id: string) {
  return apiFetch<Loan>(`/api/loans/${id}`, {
    method: "PATCH",
    body: { status: "CANCELLED" },
  });
}

export function recordPayment(
  loanId: string,
  body: {
    paymentType: "INTEREST_PAYMENT" | "PRINCIPAL_PAYMENT" | "BOTH";
    amount?: number;
    interestAmount?: number;
    principalAmount?: number;
    transactionDate: string;
    note?: string;
  },
) {
  return apiFetch<{ ok: boolean }>(`/api/loans/${loanId}/payments`, {
    method: "POST",
    body,
  });
}

export function fetchSchedules(status?: string) {
  const q = status && status !== "ALL" ? `?status=${status}` : "";
  return apiFetch<InterestSchedule[]>(`/api/schedules${q}`);
}

export function syncSchedules() {
  return apiFetch<{ ok: boolean }>("/api/schedules", { method: "POST" });
}

export function fetchTransactions(params?: { type?: string; loanId?: string }) {
  const search = new URLSearchParams();
  if (params?.type) search.set("type", params.type);
  if (params?.loanId) search.set("loanId", params.loanId);
  const q = search.toString();
  return apiFetch<Transaction[]>(`/api/transactions${q ? `?${q}` : ""}`);
}

export function fetchStats() {
  return apiFetch<{
    borrowers: number;
    loans: number;
    transactions: number;
    schedules: number;
  }>("/api/stats");
}

export function seedDemo(force = false) {
  return apiFetch<{ ok: boolean }>(
    `/api/admin/seed${force ? "?force=1" : ""}`,
    { method: "POST" },
  );
}

export function resetDatabase() {
  return apiFetch<{ ok: boolean }>("/api/admin/reset", { method: "POST" });
}

export function exportBackup() {
  return apiFetch<{
    version: number;
    exportedAt: string;
    borrowers: Borrower[];
    loans: Loan[];
    interestSchedules: InterestSchedule[];
    transactions: Transaction[];
  }>("/api/admin/backup");
}

export function importBackup(payload: unknown) {
  return apiFetch<{ ok: boolean }>("/api/admin/backup", {
    method: "POST",
    body: payload,
  });
}

export function fetchFinanceTransactions(params?: {
  month?: string;
  from?: string;
  to?: string;
}) {
  const search = new URLSearchParams();
  if (params?.month) search.set("month", params.month);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const q = search.toString();
  return apiFetch<FinanceTransaction[]>(
    `/api/finance${q ? `?${q}` : ""}`,
  );
}

export function createFinanceTransaction(body: {
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  description: string;
  note?: string;
  paymentMethod?: string;
}) {
  return apiFetch<FinanceTransaction>("/api/finance", {
    method: "POST",
    body,
  });
}

export function updateFinanceTransaction(
  id: string,
  body: {
    type: "income" | "expense";
    category: string;
    amount: number;
    date: string;
    description: string;
    note?: string;
    paymentMethod?: string;
  },
) {
  return apiFetch<FinanceTransaction>(
    `/api/finance?id=${encodeURIComponent(id)}`,
    { method: "PATCH", body },
  );
}

export function deleteFinanceTransaction(id: string) {
  return apiFetch<{ ok: boolean }>(
    `/api/finance?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

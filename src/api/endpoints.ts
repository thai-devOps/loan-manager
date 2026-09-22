import { apiFetch } from "@/api/client";
import type { FinanceTransaction } from "@/types/finance";
import type { Borrower } from "@/types/borrower";
import type { Loan } from "@/types/loan";
import type { InterestSchedule } from "@/types/interest-schedule";
import type { Transaction } from "@/types/transaction";
import type {
  AssetAllocation,
  AssetSettings,
  AssetSnapshot,
  AssetSummary,
  GoldPlan,
  GoldPurchase,
  ManualAsset,
} from "@/types/assets";

export type GoldMarketPrice = {
  source: "PNJ";
  sourceCode: string;
  sourceName: string;
  buyPricePerChi: number | null;
  sellPricePerChi: number | null;
  unit: "VND_PER_CHI";
  branch: string;
  zone: string;
  capturedAt: string;
  sourceUpdatedAt: string | null;
  note?: string;
};

export type GoldPricesLatestResponse = {
  source: "PNJ";
  zone: string;
  branch: string;
  sourceUpdatedAt: string | null;
  capturedAt: string;
  note?: string;
  stale?: boolean;
  prices: GoldMarketPrice[];
};

export type GoldTypeCatalogItem = {
  id: string;
  source: "PNJ";
  sourceCode: string;
  sourceName: string;
  zone: string;
  branch: string;
  lastBuyPricePerChi: number | null;
  lastSellPricePerChi: number | null;
  lastSourceUpdatedAt: string | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type GoldTypesResponse = {
  source: "PNJ";
  zone: string;
  items: GoldTypeCatalogItem[];
};
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

function assetsUrl(resource: string, extra?: Record<string, string>) {
  const search = new URLSearchParams({ resource, ...extra });
  return `/api/assets?${search.toString()}`;
}

export function fetchAssetSummary() {
  return apiFetch<AssetSummary>(assetsUrl("summary"));
}

export function fetchAssetAllocation() {
  return apiFetch<AssetAllocation>(assetsUrl("allocation"));
}

export function fetchManualAssets() {
  return apiFetch<ManualAsset[]>(assetsUrl("assets"));
}

export function createManualAsset(
  body: Omit<ManualAsset, "id" | "createdAt" | "updatedAt">,
) {
  return apiFetch<ManualAsset>(assetsUrl("assets"), { method: "POST", body });
}

export function updateManualAsset(
  id: string,
  body: Omit<ManualAsset, "id" | "createdAt" | "updatedAt">,
) {
  return apiFetch<ManualAsset>(assetsUrl("assets", { id }), {
    method: "PATCH",
    body,
  });
}

export function deleteManualAsset(id: string) {
  return apiFetch<{ ok: boolean }>(assetsUrl("assets", { id }), {
    method: "DELETE",
  });
}

export function fetchGoldPurchases() {
  return apiFetch<GoldPurchase[]>(assetsUrl("gold-purchases"));
}

export function createGoldPurchase(
  body: Omit<GoldPurchase, "id" | "createdAt" | "updatedAt">,
) {
  return apiFetch<GoldPurchase>(assetsUrl("gold-purchases"), {
    method: "POST",
    body,
  });
}

export function updateGoldPurchase(
  id: string,
  body: Omit<GoldPurchase, "id" | "createdAt" | "updatedAt">,
) {
  return apiFetch<GoldPurchase>(assetsUrl("gold-purchases", { id }), {
    method: "PATCH",
    body,
  });
}

export function deleteGoldPurchase(id: string) {
  return apiFetch<{ ok: boolean }>(assetsUrl("gold-purchases", { id }), {
    method: "DELETE",
  });
}

export function fetchGoldPlan() {
  return apiFetch<GoldPlan | null>(assetsUrl("gold-plan"));
}

export function upsertGoldPlan(
  body: Omit<GoldPlan, "id" | "createdAt" | "updatedAt"> & {
    budgetEffectiveFrom?: string;
  },
) {
  return apiFetch<GoldPlan>(assetsUrl("gold-plan"), { method: "PUT", body });
}

export function fetchAssetSettings() {
  return apiFetch<AssetSettings>(assetsUrl("settings"));
}

export function updateAssetSettings(body: {
  goldReferencePricePerChi?: Partial<AssetSettings["goldReferencePricePerChi"]>;
  allocationTargets?: AssetSettings["allocationTargets"] | null;
}) {
  return apiFetch<AssetSettings>(assetsUrl("settings"), {
    method: "PATCH",
    body,
  });
}

export function fetchAssetSnapshots(months = 12) {
  return apiFetch<AssetSnapshot[]>(
    assetsUrl("snapshots", { months: String(months) }),
  );
}

export function fetchGoldPricesLatest(zone?: string) {
  const q = zone ? `?zone=${encodeURIComponent(zone)}` : "";
  return apiFetch<GoldPricesLatestResponse>(`/api/gold/prices/latest${q}`);
}

export function fetchGoldTypes(zone?: string) {
  const q = zone ? `?zone=${encodeURIComponent(zone)}` : "";
  return apiFetch<GoldTypesResponse>(`/api/gold/types${q}`);
}

export function fetchGoldPrices(params?: {
  source?: string;
  zone?: string;
  code?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.source) sp.set("source", params.source);
  if (params?.zone) sp.set("zone", params.zone);
  if (params?.code) sp.set("code", params.code);
  const q = sp.toString();
  return apiFetch<GoldPricesLatestResponse>(
    `/api/gold/prices${q ? `?${q}` : ""}`,
  );
}

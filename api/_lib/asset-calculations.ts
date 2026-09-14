import { getRemainingPrincipal } from "./calculations.js";
import type {
  AssetSettings,
  GoldPurchase,
  GoldType,
  Loan,
  ManualAsset,
  Transaction,
} from "./types.js";

export const SETTINGS_ID = "default";
export const PLAN_ID = "default";

export const DEFAULT_SETTINGS: Omit<
  AssetSettings,
  "_id" | "createdAt" | "updatedAt"
> = {
  id: SETTINGS_ID,
  goldReferencePricePerChi: {
    "9999": 0,
    "18k": 0,
    other: 0,
  },
};

export function calculateLentCapital(
  loans: Loan[],
  transactions: Transaction[],
): number {
  const txsByLoan = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = txsByLoan.get(tx.loanId) ?? [];
    list.push(tx);
    txsByLoan.set(tx.loanId, list);
  }
  return loans
    .filter((l) => l.status === "ACTIVE")
    .reduce(
      (sum, loan) =>
        sum +
        getRemainingPrincipal(loan.principalAmount, txsByLoan.get(loan.id) ?? []),
      0,
    );
}

export function calculateAvailableCash(assets: ManualAsset[]): number {
  return assets
    .filter((a) => a.type === "cash" || a.type === "bank" || a.type === "wallet")
    .reduce((sum, a) => sum + a.value, 0);
}

export function calculateOtherAssets(assets: ManualAsset[]): number {
  return assets
    .filter((a) => a.type === "other")
    .reduce((sum, a) => sum + a.value, 0);
}

export function calculateManualGoldAssets(assets: ManualAsset[]): number {
  return assets
    .filter((a) => a.type === "gold")
    .reduce((sum, a) => sum + a.value, 0);
}

export function phanToChi(phan: number): number {
  return phan / 10;
}

export function calculateGoldQuantityByType(
  purchases: GoldPurchase[],
): Record<GoldType, number> {
  const result: Record<GoldType, number> = {
    "9999": 0,
    "18k": 0,
    other: 0,
  };
  for (const p of purchases) {
    result[p.type] += p.quantityInPhan;
  }
  return result;
}

export function calculateGoldCost(purchases: GoldPurchase[]): number {
  return purchases.reduce((sum, p) => sum + p.totalCost, 0);
}

export function calculateGoldEstimatedValue(
  purchases: GoldPurchase[],
  prices: AssetSettings["goldReferencePricePerChi"],
): number {
  const qty = calculateGoldQuantityByType(purchases);
  return (
    Math.round(phanToChi(qty["9999"]) * prices["9999"]) +
    Math.round(phanToChi(qty["18k"]) * prices["18k"]) +
    Math.round(phanToChi(qty.other) * prices.other)
  );
}

export function calculateTotalAssets(params: {
  lentCapital: number;
  availableCash: number;
  otherAssets: number;
  goldValue: number;
}): number {
  return (
    params.lentCapital +
    params.availableCash +
    params.otherAssets +
    params.goldValue
  );
}

export function calculateAllocationPercentage(
  part: number,
  total: number,
): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function buildAllocation(params: {
  lentCapital: number;
  availableCash: number;
  otherAssets: number;
  goldValue: number;
}) {
  const total = calculateTotalAssets(params);
  return {
    totalAssets: total,
    lentCapital: params.lentCapital,
    availableCash: params.availableCash,
    otherAssets: params.otherAssets,
    goldValue: params.goldValue,
    segments: [
      {
        key: "lending" as const,
        label: "Đang cho vay",
        amount: params.lentCapital,
        percent: calculateAllocationPercentage(params.lentCapital, total),
      },
      {
        key: "reserve" as const,
        label: "Tiền khả dụng",
        amount: params.availableCash,
        percent: calculateAllocationPercentage(params.availableCash, total),
      },
      {
        key: "other" as const,
        label: "Tài sản khác",
        amount: params.otherAssets,
        percent: calculateAllocationPercentage(params.otherAssets, total),
      },
      {
        key: "gold" as const,
        label: "Vàng",
        amount: params.goldValue,
        percent: calculateAllocationPercentage(params.goldValue, total),
      },
    ].filter((s) => s.amount > 0 || total === 0),
  };
}

export function currentMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

import type {
  AssetAllocation,
  GoldPlan,
  GoldPurchase,
  ManualAsset,
} from "@/types/assets";
import { phanToChi } from "@/features/assets/lib/gold-units";

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

export function calculateGoldCost(purchases: GoldPurchase[]): number {
  return purchases.reduce((sum, p) => sum + p.totalCost, 0);
}

export function calculateAllocationPercentage(
  part: number,
  total: number,
): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function calculateGoldGoalProgress(
  accumulated: number,
  target: number,
): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((accumulated / target) * 1000) / 10);
}

export function calculateRemainingGoldGoal(
  accumulated: number,
  target: number,
): number {
  return Math.max(target - accumulated, 0);
}

export function calculateEstimatedMonthsToGoal(
  remaining: number,
  monthlyBudget: number,
): number | null {
  if (monthlyBudget <= 0 || remaining <= 0) return null;
  return Math.ceil(remaining / monthlyBudget);
}

export function purchasesInMonth(
  purchases: GoldPurchase[],
  month: string,
): GoldPurchase[] {
  return purchases.filter((p) => p.purchaseDate.startsWith(month));
}

export function monthSpend(purchases: GoldPurchase[], month: string): number {
  return purchasesInMonth(purchases, month).reduce(
    (sum, p) => sum + p.totalCost,
    0,
  );
}

export type MonthlyPlanStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "deferred";

export function monthlyPlanStatus(params: {
  month: string;
  budget: number;
  spent: number;
  currentMonth: string;
}): MonthlyPlanStatus {
  const { month, budget, spent, currentMonth } = params;
  if (spent >= budget && budget > 0) return "completed";
  if (month > currentMonth) return "not_started";
  if (month < currentMonth && spent === 0) return "deferred";
  if (spent > 0 && spent < budget) return "in_progress";
  if (month === currentMonth && spent === 0) return "not_started";
  if (month < currentMonth && spent > 0 && spent < budget) return "deferred";
  return "in_progress";
}

export function monthlyPlanStatusLabel(status: MonthlyPlanStatus): string {
  switch (status) {
    case "not_started":
      return "Chưa thực hiện";
    case "in_progress":
      return "Đang thực hiện";
    case "completed":
      return "Đã hoàn thành";
    case "deferred":
      return "Hoãn";
  }
}

export function listPlanMonths(plan: GoldPlan): string[] {
  const months: string[] = [];
  let [y, m] = plan.startMonth.split("-").map(Number);
  const [ey, em] = plan.endMonth.split("-").map(Number);
  while (y! < ey! || (y === ey && m! <= em!)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m! += 1;
    if (m! > 12) {
      m = 1;
      y! += 1;
    }
    if (months.length > 60) break;
  }
  return months;
}

export type TargetCompareStatus = "met" | "below" | "above";

export function compareTarget(
  actual: number,
  target: number,
  tolerance = 1,
): TargetCompareStatus {
  if (Math.abs(actual - target) <= tolerance) return "met";
  return actual < target ? "below" : "above";
}

export function targetCompareLabel(status: TargetCompareStatus): string {
  switch (status) {
    case "met":
      return "Đạt mục tiêu";
    case "below":
      return "Thấp hơn mục tiêu";
    case "above":
      return "Cao hơn mục tiêu";
  }
}

export function allocationForDisplay(
  allocation: AssetAllocation,
): AssetAllocation {
  return allocation;
}

export function expectedPurchaseCost(
  quantityInPhan: number,
  pricePerChi: number,
): number {
  return Math.round(phanToChi(quantityInPhan) * pricePerChi);
}

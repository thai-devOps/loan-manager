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

export function monthQuantityPhan(
  purchases: GoldPurchase[],
  month: string,
): number {
  return purchasesInMonth(purchases, month).reduce(
    (sum, p) => sum + p.quantityInPhan,
    0,
  );
}

/** Purchases with purchaseDate in [startMonth, endMonth] inclusive (YYYY-MM). */
export function purchasesInPlanRange(
  purchases: GoldPurchase[],
  startMonth: string,
  endMonth: string,
): GoldPurchase[] {
  return purchases.filter((p) => {
    const m = p.purchaseDate.slice(0, 7);
    return m >= startMonth && m <= endMonth;
  });
}

export function purchasesBeforeMonth(
  purchases: GoldPurchase[],
  month: string,
): GoldPurchase[] {
  return purchases.filter((p) => p.purchaseDate.slice(0, 7) < month);
}

export function normalizeGoldPlan(plan: GoldPlan): GoldPlan {
  const monthlyBudget = plan.monthlyBudget;
  const startMonth = plan.startMonth;
  const history =
    Array.isArray(plan.budgetHistory) && plan.budgetHistory.length > 0
      ? plan.budgetHistory
      : [{ effectiveFrom: startMonth, monthlyBudget }];
  const goldType =
    plan.goldType === "9999" ||
    plan.goldType === "18k" ||
    plan.goldType === "other"
      ? plan.goldType
      : null;
  return {
    ...plan,
    goldType,
    targetQuantityInPhan:
      plan.targetQuantityInPhan == null ||
      !Number.isFinite(plan.targetQuantityInPhan)
        ? null
        : Math.max(0, Math.round(plan.targetQuantityInPhan)),
    initialQuantityInPhan: Number.isInteger(plan.initialQuantityInPhan)
      ? Math.max(0, plan.initialQuantityInPhan)
      : 0,
    includeInitialQuantity: Boolean(plan.includeInitialQuantity),
    budgetHistory: history,
  };
}

/** Purchases for plan progress — filter by goldType when plan has one. */
export function purchasesForPlan(
  plan: GoldPlan,
  purchases: GoldPurchase[],
): GoldPurchase[] {
  const normalized = normalizeGoldPlan(plan);
  const inRange = purchasesInPlanRange(
    purchases,
    normalized.startMonth,
    normalized.endMonth,
  );
  if (!normalized.goldType) return inRange;
  return inRange.filter((p) => p.type === normalized.goldType);
}

/** Rule 1A: (initial if included) + sum qty of plan-type purchases in range. */
export function planAccumulatedPhan(
  plan: GoldPlan,
  purchases: GoldPurchase[],
): number {
  const normalized = normalizeGoldPlan(plan);
  const initial = normalized.includeInitialQuantity
    ? normalized.initialQuantityInPhan
    : 0;
  return (
    initial +
    purchasesForPlan(normalized, purchases).reduce(
      (sum, p) => sum + p.quantityInPhan,
      0,
    )
  );
}

export function planRemainingPhan(
  plan: GoldPlan,
  purchases: GoldPurchase[],
): number | null {
  const target = normalizeGoldPlan(plan).targetQuantityInPhan;
  if (target == null || target <= 0) return null;
  return Math.max(target - planAccumulatedPhan(plan, purchases), 0);
}

export function planHasQuantityTarget(plan: GoldPlan): boolean {
  const qty = normalizeGoldPlan(plan).targetQuantityInPhan;
  return qty != null && qty > 0;
}

/** Budget effective for a given YYYY-MM from history (latest entry with effectiveFrom <= month). */
export function budgetForMonth(plan: GoldPlan, month: string): number {
  const normalized = normalizeGoldPlan(plan);
  const applicable = normalized.budgetHistory
    .filter((e) => e.effectiveFrom <= month)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return applicable[0]?.monthlyBudget ?? normalized.monthlyBudget;
}

export type MonthlyPlanStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "exceeded"
  | "deferred"
  | "paused";

export function monthlyPlanStatus(params: {
  month: string;
  budget: number;
  spent: number;
  currentMonth: string;
  planStatus?: GoldPlan["status"];
}): MonthlyPlanStatus {
  const { month, budget, spent, currentMonth, planStatus } = params;
  if (planStatus === "paused" && month === currentMonth) return "paused";
  if (spent > budget && budget > 0) return "exceeded";
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
      return "Chưa bắt đầu";
    case "in_progress":
      return "Đang thực hiện";
    case "completed":
      return "Đã hoàn thành";
    case "exceeded":
      return "Vượt kế hoạch";
    case "deferred":
      return "Đã bỏ qua";
    case "paused":
      return "Tạm dừng";
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

/**
 * Ước tính số phân mua được từ ngân sách theo giá tham chiếu (₫/chỉ).
 * Làm tròn xuống phân nguyên — không cam kết giá thực tế.
 */
export function estimatePhanFromBudget(
  monthlyBudget: number,
  pricePerChi: number,
): number | null {
  if (monthlyBudget <= 0 || pricePerChi <= 0) return null;
  return Math.floor((monthlyBudget / pricePerChi) * 10);
}

/** Số tháng ước tính để đủ remainingPhan nếu mỗi tháng mua được monthlyPhan. */
export function estimateMonthsFromQuantity(
  remainingPhan: number,
  monthlyPhan: number,
): number | null {
  if (remainingPhan <= 0) return 0;
  if (monthlyPhan <= 0) return null;
  return Math.ceil(remainingPhan / monthlyPhan);
}

/** Prefer chi for form display of integer phân. */
export function phanToFormQuantity(phan: number): {
  quantity: number;
  unit: "cay" | "chi" | "phan";
} {
  if (phan <= 0) return { quantity: 1, unit: "chi" };
  if (phan % 100 === 0) return { quantity: phan / 100, unit: "cay" };
  if (phan % 10 === 0) return { quantity: phan / 10, unit: "chi" };
  return { quantity: phan, unit: "phan" };
}

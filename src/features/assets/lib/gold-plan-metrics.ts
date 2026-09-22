import {
  budgetForMonth,
  calculateGoldGoalProgress,
  estimateChiFromBudget,
  estimateMonthsFromChi,
  listPlanMonths,
  monthQuantityPhan,
  monthSpend,
  monthlyPlanStatus,
  normalizeGoldPlan,
  planAccumulatedPhan,
  planHasQuantityTarget,
  purchasesForPlan,
  type MonthlyPlanStatus,
} from "@/features/assets/lib/calculations";
import { phanToChi } from "@/features/assets/lib/gold-units";
import type { GoldPlan, GoldPurchase } from "@/types/assets";

export type GoldPlanMetrics = {
  hasQuantityTarget: boolean;
  targetPhan: number;
  targetChi: number;
  /** Initial gold counted toward goal (0 if include off). */
  existingPhan: number;
  existingChi: number;
  /** Purchases in plan range + matching gold type. */
  purchasedPhan: number;
  purchasedChi: number;
  accumulatedPhan: number;
  accumulatedChi: number;
  remainingPhan: number;
  remainingChi: number;
  /** Cap 100. */
  progressPercent: number;
  /** Extra above target (phan); 0 if not overrun. */
  overrunPhan: number;
  overrunChi: number;
  goalMet: boolean;
  monthlyBudget: number;
  /** Estimated phân/month (fractional, budget÷price×10). */
  estimatedMonthlyPhan: number | null;
  estimatedChiPerMonth: number | null;
  /** Fractional months remaining (estimate). */
  estimatedMonths: number | null;
  /** YYYY-MM estimated completion from current month (or null). */
  estimatedEndMonth: string | null;
  /** Months left in plan window from nowMonth inclusive to endMonth. */
  remainingMonthsToEnd: number | null;
  /** ₫/month needed to finish by endMonth (estimate). */
  requiredBudgetPerMonth: number | null;
  /** true when estimated end is on/before plan.endMonth (or remaining=0). */
  paceOk: boolean;
};

function addMonths(monthKey: string, count: number): string {
  const [y0, m0] = monthKey.split("-").map(Number);
  const d = new Date(y0!, m0! - 1 + count, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive month count from `from` to `to` (YYYY-MM). Null if invalid. */
export function monthsInclusive(from: string, to: string): number | null {
  if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to)) return null;
  if (to < from) return null;
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty! - fy!) * 12 + (tm! - fm!) + 1;
}

/**
 * Quantity-first plan metrics. Progress never uses money/goldCost.
 * Pass a provisional plan (e.g. form draft) — will be normalized.
 */
export function computeGoldPlanMetrics(
  plan: GoldPlan,
  purchases: GoldPurchase[],
  pricePerChi: number,
  nowMonth: string,
): GoldPlanMetrics {
  const normalized = normalizeGoldPlan(plan);
  const hasQuantityTarget = planHasQuantityTarget(normalized);
  const targetPhan = hasQuantityTarget
    ? (normalized.targetQuantityInPhan ?? 0)
    : 0;

  const existingPhan = normalized.includeInitialQuantity
    ? Math.max(0, normalized.initialQuantityInPhan)
    : 0;

  const purchasedPhan = purchasesForPlan(normalized, purchases).reduce(
    (sum, p) => sum + p.quantityInPhan,
    0,
  );

  const accumulatedPhan = hasQuantityTarget
    ? planAccumulatedPhan(normalized, purchases)
    : existingPhan + purchasedPhan;

  const remainingPhan = hasQuantityTarget
    ? Math.max(targetPhan - accumulatedPhan, 0)
    : 0;
  const overrunPhan = hasQuantityTarget
    ? Math.max(accumulatedPhan - targetPhan, 0)
    : 0;
  const progressPercent = hasQuantityTarget
    ? calculateGoldGoalProgress(accumulatedPhan, targetPhan)
    : 0;
  const goalMet = hasQuantityTarget && accumulatedPhan >= targetPhan;

  const estimatedChiPerMonth = estimateChiFromBudget(
    normalized.monthlyBudget,
    pricePerChi,
  );
  const estimatedMonthlyPhan =
    estimatedChiPerMonth != null ? estimatedChiPerMonth * 10 : null;
  const remainingChi = phanToChi(remainingPhan);
  const estimatedMonths =
    estimatedChiPerMonth != null
      ? estimateMonthsFromChi(remainingChi, estimatedChiPerMonth)
      : null;

  let estimatedEndMonth: string | null = null;
  if (goalMet) {
    estimatedEndMonth = nowMonth;
  } else if (estimatedMonths != null && estimatedMonths > 0) {
    const monthsCeil = Math.max(1, Math.ceil(estimatedMonths));
    estimatedEndMonth = addMonths(nowMonth, monthsCeil - 1);
  }

  const endFrom = nowMonth > normalized.startMonth ? nowMonth : normalized.startMonth;
  const remainingMonthsToEnd = monthsInclusive(endFrom, normalized.endMonth);

  let requiredBudgetPerMonth: number | null = null;
  if (
    remainingPhan > 0 &&
    pricePerChi > 0 &&
    remainingMonthsToEnd != null &&
    remainingMonthsToEnd > 0
  ) {
    requiredBudgetPerMonth = Math.ceil(
      (remainingChi * pricePerChi) / remainingMonthsToEnd,
    );
  }

  let paceOk = true;
  if (remainingPhan > 0 && estimatedEndMonth && normalized.endMonth) {
    paceOk = estimatedEndMonth <= normalized.endMonth;
  }
  if (!hasQuantityTarget || remainingPhan <= 0) {
    paceOk = true;
  }
  if (estimatedMonths == null && remainingPhan > 0) {
    paceOk = true;
  }

  return {
    hasQuantityTarget,
    targetPhan,
    targetChi: phanToChi(targetPhan),
    existingPhan,
    existingChi: phanToChi(existingPhan),
    purchasedPhan,
    purchasedChi: phanToChi(purchasedPhan),
    accumulatedPhan,
    accumulatedChi: phanToChi(accumulatedPhan),
    remainingPhan,
    remainingChi,
    progressPercent,
    overrunPhan,
    overrunChi: phanToChi(overrunPhan),
    goalMet,
    monthlyBudget: normalized.monthlyBudget,
    estimatedMonthlyPhan,
    estimatedChiPerMonth,
    estimatedMonths,
    estimatedEndMonth,
    remainingMonthsToEnd,
    requiredBudgetPerMonth,
    paceOk,
  };
}

export type GoldPlanMonthRow = {
  month: string;
  budget: number;
  spent: number;
  quantityPhan: number;
  status: MonthlyPlanStatus;
};

/** Compact monthly rows derived from purchases (no manual checkbox). */
export function buildGoldPlanMonthRows(
  plan: GoldPlan,
  purchases: GoldPurchase[],
  currentMonth: string,
): GoldPlanMonthRow[] {
  const normalized = normalizeGoldPlan(plan);
  // For monthly spend/qty: filter by goldType only (calendar month).
  const byType =
    normalized.goldType != null
      ? purchases.filter((p) => p.type === normalized.goldType)
      : purchases;

  return listPlanMonths(normalized).map((month) => {
    const budget = budgetForMonth(normalized, month);
    const spent = monthSpend(byType, month);
    const quantityPhan = monthQuantityPhan(byType, month);
    const status = monthlyPlanStatus({
      month,
      budget,
      spent,
      currentMonth,
      planStatus: normalized.status,
    });
    return { month, budget, spent, quantityPhan, status };
  });
}

/** Provisional plan shape for live form preview (id/timestamps placeholders). */
export function defaultReferenceSourceCode(
  goldType: GoldPlan["goldType"],
): string | null {
  if (goldType === "9999") return "N24K";
  if (goldType === "18k") return "75";
  return null;
}

export function draftPlanFromForm(params: {
  goldType: GoldPlan["goldType"];
  targetQuantityInPhan: number;
  initialQuantityInPhan: number;
  includeInitialQuantity: boolean;
  monthlyBudget: number;
  plannedPurchaseDay: number;
  startMonth: string;
  endMonth: string;
  referenceSourceCode?: string | null;
  status?: GoldPlan["status"];
  existing?: GoldPlan | null;
}): GoldPlan {
  const existing = params.existing ? normalizeGoldPlan(params.existing) : null;
  const referenceSourceCode =
    params.referenceSourceCode !== undefined
      ? params.referenceSourceCode
      : (existing?.referenceSourceCode ??
        defaultReferenceSourceCode(params.goldType ?? null));
  return {
    id: existing?.id ?? "default",
    targetAmount: existing?.targetAmount ?? Math.max(params.monthlyBudget, 1),
    targetQuantityInPhan: params.targetQuantityInPhan,
    goldType: params.goldType ?? null,
    referenceSourceCode,
    initialQuantityInPhan: params.initialQuantityInPhan,
    includeInitialQuantity: params.includeInitialQuantity,
    monthlyBudget: params.monthlyBudget,
    budgetHistory: existing?.budgetHistory ?? [
      {
        effectiveFrom: params.startMonth,
        monthlyBudget: params.monthlyBudget,
      },
    ],
    plannedPurchaseDay: params.plannedPurchaseDay,
    startMonth: params.startMonth,
    endMonth: params.endMonth,
    status: params.status ?? existing?.status ?? "active",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
  };
}

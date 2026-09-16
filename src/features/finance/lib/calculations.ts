import { format, parseISO, subMonths, startOfMonth, endOfMonth } from "date-fns";
import type { FinanceTransaction } from "@/types/finance";
import type { Transaction } from "@/types/transaction";
import { getPeriodFromISO, isoToDateInput } from "@/lib/date";

export function filterByMonth(
  items: FinanceTransaction[],
  month: string,
): FinanceTransaction[] {
  return items.filter((t) => t.date.startsWith(month));
}

export function calculateTotalIncome(items: FinanceTransaction[]): number {
  return items
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateLivingExpenses(items: FinanceTransaction[]): number {
  return items
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Collections from borrowers (interest + principal) in a month. */
export function calculateLoanCollections(
  loanTxs: Transaction[],
  month: string,
): number {
  return loanTxs
    .filter((t) => {
      const period = getPeriodFromISO(t.transactionDate);
      return (
        period === month &&
        (t.type === "INTEREST_PAYMENT" || t.type === "PRINCIPAL_PAYMENT")
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Collections in an inclusive date range (yyyy-MM-dd), using VN calendar date of tx. */
export function calculateLoanCollectionsInRange(
  loanTxs: Transaction[],
  from: string,
  to: string,
): number {
  return loanTxs
    .filter((t) => {
      if (t.type !== "INTEREST_PAYMENT" && t.type !== "PRINCIPAL_PAYMENT") {
        return false;
      }
      const day = isoToDateInput(t.transactionDate);
      return day >= from && day <= to;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateRemainingCash(params: {
  income: number;
  livingExpenses: number;
  loanCollections: number;
}): number {
  return params.income + params.loanCollections - params.livingExpenses;
}

export function calculateExpenseRatio(
  livingExpenses: number,
  income: number,
): number | null {
  if (income <= 0) return null;
  return (livingExpenses / income) * 100;
}

export function calculateSavingsRate(
  remaining: number,
  income: number,
  loanCollections: number,
): number | null {
  const base = income + loanCollections;
  if (base <= 0) return null;
  return (remaining / base) * 100;
}

export function calculateCategoryTotals(
  items: FinanceTransaction[],
  type: "income" | "expense",
): { category: string; amount: number; percent: number }[] {
  const filtered = items.filter((t) => t.type === type);
  const total = filtered.reduce((s, t) => s + t.amount, 0);
  const map = new Map<string, number>();
  for (const t of filtered) {
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

export function calculateMonthlyComparison(params: {
  currentIncome: number;
  previousIncome: number;
  currentExpenses: number;
  previousExpenses: number;
  currentRemaining: number;
  previousRemaining: number;
  hasPreviousData: boolean;
}) {
  if (!params.hasPreviousData) return null;
  return {
    income: percentChange(params.currentIncome, params.previousIncome),
    expenses: percentChange(params.currentExpenses, params.previousExpenses),
    remaining: percentChange(
      params.currentRemaining,
      params.previousRemaining,
    ),
  };
}

export function groupCashFlowByMonth(params: {
  financeTxs: FinanceTransaction[];
  loanTxs: Transaction[];
  months: string[];
}): {
  period: string;
  income: number;
  expenses: number;
  loanCollections: number;
  remaining: number;
}[] {
  return params.months.map((month) => {
    const monthItems = filterByMonth(params.financeTxs, month);
    const income = calculateTotalIncome(monthItems);
    const expenses = calculateLivingExpenses(monthItems);
    const loanCollections = calculateLoanCollections(params.loanTxs, month);
    return {
      period: month,
      income,
      expenses,
      loanCollections,
      remaining: calculateRemainingCash({
        income,
        livingExpenses: expenses,
        loanCollections,
      }),
    };
  });
}

export function currentMonthKey(date = new Date()): string {
  return format(date, "yyyy-MM");
}

export function previousMonthKey(month: string): string {
  return format(subMonths(parseISO(`${month}-01`), 1), "yyyy-MM");
}

export function monthRangeKeys(
  endMonth: string,
  count: number,
): string[] {
  const end = parseISO(`${endMonth}-01`);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(format(subMonths(end, i), "yyyy-MM"));
  }
  return keys;
}

export function monthDateBounds(month: string): { from: string; to: string } {
  const start = startOfMonth(parseISO(`${month}-01`));
  const end = endOfMonth(start);
  return {
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  };
}

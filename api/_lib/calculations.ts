import {
  addMonths,
  endOfMonth,
  getDate,
  isBefore,
  isValid,
  parseISO,
  setDate,
  startOfDay,
  format,
} from "date-fns";
import type { InterestSchedule, InterestScheduleStatus, Loan, Transaction } from "./types";
import { getPeriodFromISO } from "./date";

export function getPrincipalPaid(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "PRINCIPAL_PAYMENT")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getInterestPaid(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "INTEREST_PAYMENT")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getDisbursedAmount(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "DISBURSEMENT")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getRemainingPrincipal(
  originalPrincipal: number,
  transactions: Transaction[],
): number {
  return Math.max(originalPrincipal - getPrincipalPaid(transactions), 0);
}

export function getScheduleRemaining(schedule: InterestSchedule): number {
  return Math.max(schedule.amount - schedule.paidAmount, 0);
}

export function resolveScheduleStatus(
  schedule: Pick<InterestSchedule, "amount" | "paidAmount" | "dueDate">,
  today: Date = new Date(),
): InterestScheduleStatus {
  if (schedule.paidAmount >= schedule.amount) {
    return "PAID";
  }

  if (schedule.paidAmount > 0) {
    return "PARTIAL";
  }

  const due = startOfDay(parseISO(schedule.dueDate));
  const now = startOfDay(today);
  if (isValid(due) && isBefore(due, now)) {
    return "OVERDUE";
  }

  return "PENDING";
}

/**
 * Build due date for monthOffset months after startDate,
 * clamping to end of month when the day does not exist.
 */
export function buildDueDate(startDateISO: string, monthOffset: number): Date {
  const start = parseISO(startDateISO);
  const targetMonth = addMonths(start, monthOffset);
  const desiredDay = getDate(start);
  const lastDay = getDate(endOfMonth(targetMonth));
  return setDate(targetMonth, Math.min(desiredDay, lastDay));
}

/**
 * Generate monthly interest schedules.
 * First due date is 1 month after startDate (e.g. lend 14/09 → due 14/10).
 */
export function generateInterestSchedules(
  loan: Pick<Loan, "id" | "monthlyInterestAmount" | "startDate">,
  months = 12,
  existingPeriods: Set<string> = new Set(),
): InterestSchedule[] {
  const schedules: InterestSchedule[] = [];

  // Offset starts at 1: ngày cho vay chưa đến hạn; kỳ đầu = tháng sau
  for (let i = 1; i <= months; i++) {
    const due = buildDueDate(loan.startDate, i);
    const dueISO = due.toISOString();
    const period = format(due, "yyyy-MM");

    if (existingPeriods.has(period)) {
      continue;
    }

    schedules.push({
      id: crypto.randomUUID(),
      loanId: loan.id,
      period,
      dueDate: dueISO,
      amount: loan.monthlyInterestAmount,
      paidAmount: 0,
      status: resolveScheduleStatus({
        amount: loan.monthlyInterestAmount,
        paidAmount: 0,
        dueDate: dueISO,
      }),
    });
  }

  return schedules;
}

/**
 * Ensure an ACTIVE loan has schedules covering roughly `horizonMonths`
 * ahead of today. Returns newly generated schedules (not yet persisted).
 */
export function ensureInterestSchedules(
  loan: Loan,
  existing: InterestSchedule[],
  horizonMonths = 12,
  today: Date = new Date(),
): InterestSchedule[] {
  if (loan.status !== "ACTIVE") {
    return [];
  }

  const existingPeriods = new Set(existing.map((s) => s.period));
  const start = parseISO(loan.startDate);
  const sorted = [...existing].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const lastSchedule = sorted.at(-1);

  // First possible due is always +1 month from startDate
  let nextOffset = 1;
  if (lastSchedule) {
    const lastDue = parseISO(lastSchedule.dueDate);
    nextOffset =
      (lastDue.getFullYear() - start.getFullYear()) * 12 +
      (lastDue.getMonth() - start.getMonth()) +
      1;
  }

  const horizonEnd = addMonths(startOfDay(today), horizonMonths);
  const lastDue = lastSchedule ? startOfDay(parseISO(lastSchedule.dueDate)) : null;

  // Already covered far enough into the future
  if (lastDue && !isBefore(lastDue, horizonEnd)) {
    return [];
  }

  const newSchedules: InterestSchedule[] = [];

  for (let i = nextOffset; i < nextOffset + horizonMonths + 1; i++) {
    const due = buildDueDate(loan.startDate, i);
    const dueStart = startOfDay(due);

    if (isBefore(horizonEnd, dueStart)) {
      break;
    }

    const dueISO = due.toISOString();
    const period = format(due, "yyyy-MM");
    if (existingPeriods.has(period)) {
      continue;
    }

    newSchedules.push({
      id: crypto.randomUUID(),
      loanId: loan.id,
      period,
      dueDate: dueISO,
      amount: loan.monthlyInterestAmount,
      paidAmount: 0,
      status: resolveScheduleStatus({
        amount: loan.monthlyInterestAmount,
        paidAmount: 0,
        dueDate: dueISO,
      }),
    });
    existingPeriods.add(period);
  }

  return newSchedules;
}

/**
 * Apply an interest payment across unpaid schedules in FIFO order (oldest first).
 * Returns updated schedule copies (does not mutate originals).
 */
export function applyInterestPaymentToSchedules(
  schedules: InterestSchedule[],
  paymentAmount: number,
  today: Date = new Date(),
): InterestSchedule[] {
  let remaining = paymentAmount;
  const sorted = [...schedules].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  );

  const updated = sorted.map((schedule) => {
    if (remaining <= 0 || schedule.paidAmount >= schedule.amount) {
      return {
        ...schedule,
        status: resolveScheduleStatus(schedule, today),
      };
    }

    const need = schedule.amount - schedule.paidAmount;
    const applied = Math.min(need, remaining);
    remaining -= applied;
    const next = {
      ...schedule,
      paidAmount: schedule.paidAmount + applied,
    };
    return {
      ...next,
      status: resolveScheduleStatus(next, today),
    };
  });

  // Preserve original relative order by mapping back via id
  const byId = new Map(updated.map((s) => [s.id, s]));
  return schedules.map((s) => byId.get(s.id) ?? s);
}

export function shouldCompleteLoan(remainingPrincipal: number): boolean {
  return remainingPrincipal <= 0;
}

export function getCurrentInterestSchedule(
  schedules: InterestSchedule[],
  today: Date = new Date(),
): InterestSchedule | undefined {
  const unpaid = schedules
    .filter((s) => s.status !== "PAID")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (unpaid.length === 0) {
    return undefined;
  }

  const periodToday = format(today, "yyyy-MM");
  const thisMonth = unpaid.find((s) => s.period === periodToday);
  return thisMonth ?? unpaid[0];
}

export function getCollectibleInterest(
  schedules: InterestSchedule[],
): number {
  return schedules
    .filter((s) => s.status !== "PAID")
    .reduce((sum, s) => sum + getScheduleRemaining(s), 0);
}

export function getOverdueSchedules(
  schedules: InterestSchedule[],
  today: Date = new Date(),
): InterestSchedule[] {
  return schedules.filter(
    (s) => resolveScheduleStatus(s, today) === "OVERDUE" || s.status === "OVERDUE",
  );
}

export function refreshScheduleStatuses(
  schedules: InterestSchedule[],
  today: Date = new Date(),
): InterestSchedule[] {
  return schedules.map((s) => ({
    ...s,
    status: resolveScheduleStatus(s, today),
  }));
}

export function sumLoanRemainingPrincipal(
  loans: Loan[],
  transactionsByLoanId: Map<string, Transaction[]>,
): number {
  return loans.reduce((sum, loan) => {
    const txs = transactionsByLoanId.get(loan.id) ?? [];
    return sum + getRemainingPrincipal(loan.principalAmount, txs);
  }, 0);
}

export function groupTransactionsByMonth(
  transactions: Transaction[],
  type: Transaction["type"],
): { period: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const period = getPeriodFromISO(tx.transactionDate);
    map.set(period, (map.get(period) ?? 0) + tx.amount);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, amount]) => ({ period, amount }));
}

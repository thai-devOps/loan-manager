import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subQuarters,
  subYears,
} from "date-fns";
import { PERMISSIONS } from "../access/permissions.js";
import { SYSTEM_ROLE_CODES } from "../access/roles.js";

export type ReportKind =
  | "income"
  | "expense"
  | "interest"
  | "principal"
  | "disbursement";

export type ReportFilterKind =
  | "all"
  | "income"
  | "expense"
  | "interest"
  | "principal"
  | "disbursement"
  | "cash_in"
  | "cash_out"
  | "actual_income";

export type ReportPreset =
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export const REPORT_PRESET_OPTIONS: { value: ReportPreset; label: string }[] = [
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "this_quarter", label: "Quý này" },
  { value: "last_quarter", label: "Quý trước" },
  { value: "this_year", label: "Năm nay" },
  { value: "last_year", label: "Năm trước" },
  { value: "custom", label: "Tùy chỉnh" },
];

export const LOAN_INTEREST_CATEGORY = "loan_interest";

export type ReportEvent = {
  id: string;
  kind: ReportKind;
  amount: number;
  /** Vietnam calendar date, yyyy-MM-dd. */
  date: string;
  category?: string;
  description?: string;
  paymentMethod?: string;
  loanId?: string;
  note?: string;
  voided?: boolean;
};

export type CashSummary = {
  cashIn: number;
  cashOut: number;
  netCash: number;
  actualIncome: number;
  actualExpense: number;
  interestIncome: number;
  principalCollected: number;
  disbursed: number;
  openingCash: null;
  endingCash: null;
  balanceReason: "missing_opening_balance";
};

export type MetricDelta = {
  current: number;
  previous: number;
  difference: number;
  percent: number | null;
  label: string;
};

export type CategorySlice = {
  category: string;
  amount: number;
  percent: number;
};

export type ChartPoint = {
  key: string;
  label: string;
  cashIn: number;
  cashOut: number;
  netCash: number;
};

const WEEK_OPTS = { weekStartsOn: 1 as const };
const KIND_FILTER: Record<ReportFilterKind, ReportKind[] | null> = {
  all: null,
  income: ["income"],
  expense: ["expense"],
  interest: ["interest"],
  principal: ["principal"],
  disbursement: ["disbursement"],
  cash_in: ["income", "interest", "principal"],
  cash_out: ["expense", "disbursement"],
  actual_income: ["income", "interest"],
};

export function allows(
  permissions: string[],
  roleCodes: string[],
  required: string | string[],
): boolean {
  if (roleCodes.includes(SYSTEM_ROLE_CODES.SUPER_ADMIN)) return true;
  const needed = Array.isArray(required) ? required : [required];
  return needed.every((code) => permissions.includes(code));
}

export function canViewFinanceReport(
  permissions: string[],
  roleCodes: string[],
): boolean {
  return allows(permissions, roleCodes, PERMISSIONS.FINANCE_TRANSACTION_VIEW);
}

export function canExportFinanceReport(
  permissions: string[],
  roleCodes: string[],
): boolean {
  return allows(permissions, roleCodes, [
    PERMISSIONS.FINANCE_TRANSACTION_VIEW,
    PERMISSIONS.FINANCE_TRANSACTION_EXPORT,
  ]);
}

export function canIncludeLoans(
  permissions: string[],
  roleCodes: string[],
): boolean {
  return allows(permissions, roleCodes, [
    PERMISSIONS.LOAN_LOAN_VIEW,
    PERMISSIONS.LOAN_TRANSACTION_VIEW,
  ]);
}

export function canIncludeSchedules(
  permissions: string[],
  roleCodes: string[],
): boolean {
  return (
    canIncludeLoans(permissions, roleCodes) &&
    allows(permissions, roleCodes, PERMISSIONS.LOAN_SCHEDULE_VIEW)
  );
}

export function canIncludeAssets(
  permissions: string[],
  roleCodes: string[],
): boolean {
  return allows(permissions, roleCodes, PERMISSIONS.ASSET_DASHBOARD_VIEW);
}

/** Payment channel "transfer" is still real income or expense. */
export function isInternalTransfer(_event: Pick<ReportEvent, "kind" | "paymentMethod">): boolean {
  return false;
}

export function isReportable(event: Pick<ReportEvent, "voided" | "amount" | "kind">): boolean {
  if (event.voided === true) return false;
  if (isInternalTransfer(event)) return false;
  return Number.isInteger(event.amount) && event.amount > 0;
}

export function vnDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dedupeEvents(events: ReportEvent[]): ReportEvent[] {
  const seen = new Set<string>();
  const kept: ReportEvent[] = [];
  for (const event of events) {
    if (!isReportable(event)) continue;
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    kept.push(event);
  }
  return kept;
}

export function eventsInRange(
  events: ReportEvent[],
  from: string,
  to: string,
): ReportEvent[] {
  return dedupeEvents(events).filter((event) => {
    const day = vnDateKey(event.date);
    return day >= from && day <= to;
  });
}

function sumKind(events: ReportEvent[], kinds: ReportKind[]): number {
  return events
    .filter((event) => kinds.includes(event.kind))
    .reduce((sum, event) => sum + event.amount, 0);
}

export function summarize(events: ReportEvent[]): CashSummary {
  const rows = dedupeEvents(events);
  const cashIn = sumKind(rows, ["income", "interest", "principal"]);
  const cashOut = sumKind(rows, ["expense", "disbursement"]);
  return {
    cashIn,
    cashOut,
    netCash: cashIn - cashOut,
    actualIncome: sumKind(rows, ["income", "interest"]),
    actualExpense: sumKind(rows, ["expense"]),
    interestIncome: sumKind(rows, ["interest"]),
    principalCollected: sumKind(rows, ["principal"]),
    disbursed: sumKind(rows, ["disbursement"]),
    openingCash: null,
    endingCash: null,
    balanceReason: "missing_opening_balance",
  };
}

export type SalaryCycleRow = {
  from: string;
  to: string;
  label: string;
  current: boolean;
  cashIn: number;
  cashOut: number;
  netCash: number;
  loanCollected: number | null;
};

export type SalaryCycleReport = {
  payday: number;
  cycles: SalaryCycleRow[];
  totals: {
    cashIn: number;
    cashOut: number;
    netCash: number;
    loanCollected: number | null;
  };
};

function clampPayday(day: number): number {
  if (!Number.isFinite(day)) return 10;
  return Math.min(28, Math.max(1, Math.round(day)));
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year!, (month ?? 1) - 1, day ?? 1);
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function paydayOn(year: number, monthIndex: number, payday: number): Date {
  const last = endOfMonth(new Date(year, monthIndex, 1)).getDate();
  return new Date(year, monthIndex, Math.min(payday, last));
}

/** Inclusive payday through the day before the next payday. */
function cycleContaining(day: Date, payday: number): { from: Date; to: Date } {
  const monthPayday = paydayOn(day.getFullYear(), day.getMonth(), payday);
  let start: Date;
  let nextPayday: Date;
  if (day >= monthPayday) {
    start = monthPayday;
    const next = addMonths(monthPayday, 1);
    nextPayday = paydayOn(next.getFullYear(), next.getMonth(), payday);
  } else {
    const prev = addMonths(monthPayday, -1);
    start = paydayOn(prev.getFullYear(), prev.getMonth(), payday);
    nextPayday = monthPayday;
  }
  return { from: start, to: subDays(nextPayday, 1) };
}

export function salaryCycles(
  events: ReportEvent[],
  payday: number,
  today: string,
  includeLoans: boolean,
): SalaryCycleReport {
  const day = clampPayday(payday);
  const totals = {
    cashIn: 0,
    cashOut: 0,
    netCash: 0,
    loanCollected: includeLoans ? 0 : null,
  };
  const rows = dedupeEvents(events).filter((event) => event.kind !== "disbursement");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || rows.length === 0) {
    return { payday: day, cycles: [], totals };
  }
  const earliest = rows.reduce(
    (min, event) => (event.date && event.date < min ? event.date : min),
    rows[0]!.date,
  );
  if (!earliest || earliest > today) return { payday: day, cycles: [], totals };

  let cursor = cycleContaining(dateFromKey(earliest), day);
  const todayStart = dateKey(cycleContaining(dateFromKey(today), day).from);
  const cycles: SalaryCycleRow[] = [];

  for (let guard = 0; guard < 80; guard += 1) {
    const from = dateKey(cursor.from);
    const fullTo = dateKey(cursor.to);
    const current = from === todayStart;
    const to = current && fullTo > today ? today : fullTo;
    const summary = summarize(eventsInRange(rows, from, to));
    if (summary.cashIn !== 0 || summary.cashOut !== 0) {
      const loanCollected = includeLoans
        ? summary.interestIncome + summary.principalCollected
        : null;
      const span = `${format(dateFromKey(from), "dd/MM/yyyy")} – ${format(dateFromKey(to), "dd/MM/yyyy")}`;
      cycles.push({
        from,
        to,
        label: current ? `${span} · đang chạy` : span,
        current,
        cashIn: summary.cashIn,
        cashOut: summary.cashOut,
        netCash: summary.netCash,
        loanCollected,
      });
      totals.cashIn += summary.cashIn;
      totals.cashOut += summary.cashOut;
      totals.netCash += summary.netCash;
      if (totals.loanCollected != null && loanCollected != null) {
        totals.loanCollected += loanCollected;
      }
    }
    if (current || from > todayStart) break;
    const next = cycleContaining(addDays(cursor.to, 1), day);
    if (dateKey(next.from) <= from) break;
    cursor = next;
  }

  return { payday: day, cycles, totals };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function metricDelta(
  current: number,
  previous: number,
  hasPrevious: boolean,
): MetricDelta {
  const percent = hasPrevious ? percentChange(current, previous) : null;
  let label = "Không có thay đổi";
  if (!hasPrevious && current !== 0) label = "Chưa có kỳ trước";
  else if (hasPrevious && previous === 0 && current !== 0) label = "Kỳ trước bằng 0";
  else if (percent !== null && percent !== 0) {
    const sign = percent > 0 ? "+" : "";
    label = `${sign}${percent.toFixed(1)}% so với kỳ trước`;
  }
  return {
    current,
    previous,
    difference: current - previous,
    percent,
    label,
  };
}

export type ChartGrain = "day" | "week" | "month";

export function chartGrain(from: string, to: string): ChartGrain {
  const days = differenceInCalendarDays(parseDay(to), parseDay(from)) + 1;
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

function parseDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function bucketKey(date: string, grain: ChartGrain): string {
  const parsed = parseDay(vnDateKey(date));
  if (grain === "day") return dayKey(parsed);
  if (grain === "week") return dayKey(startOfWeek(parsed, WEEK_OPTS));
  return format(parsed, "yyyy-MM");
}

function bucketLabel(key: string, grain: ChartGrain): string {
  if (grain === "month") {
    const [year, month] = key.split("-");
    return `${month}/${year}`;
  }
  const [, month, day] = key.split("-");
  return `${day}/${month}`;
}

export function chartSeries(
  events: ReportEvent[],
  from: string,
  to: string,
  grain: ChartGrain = chartGrain(from, to),
): { grain: ChartGrain; points: ChartPoint[] } {
  events = dedupeEvents(events);
  const totals = new Map<string, { cashIn: number; cashOut: number }>();
  for (const event of events) {
    const key = bucketKey(event.date, grain);
    const row = totals.get(key) ?? { cashIn: 0, cashOut: 0 };
    if (event.kind === "income" || event.kind === "interest" || event.kind === "principal") {
      row.cashIn += event.amount;
    } else {
      row.cashOut += event.amount;
    }
    totals.set(key, row);
  }

  const keys: string[] = [];
  if (grain === "day") {
    for (const day of eachDayOfInterval({ start: parseDay(from), end: parseDay(to) })) {
      keys.push(dayKey(day));
    }
  } else if (grain === "week") {
    let cursor = startOfWeek(parseDay(from), WEEK_OPTS);
    const end = parseDay(to);
    while (cursor <= end) {
      keys.push(dayKey(cursor));
      cursor = addDays(cursor, 7);
    }
  } else {
    let cursor = startOfMonth(parseDay(from));
    const end = parseDay(to);
    while (cursor <= end) {
      keys.push(format(cursor, "yyyy-MM"));
      cursor = addDays(endOfMonth(cursor), 1);
    }
  }

  return {
    grain,
    points: keys.map((key) => {
      const row = totals.get(key) ?? { cashIn: 0, cashOut: 0 };
      return {
        key,
        label: bucketLabel(key, grain),
        cashIn: row.cashIn,
        cashOut: row.cashOut,
        netCash: row.cashIn - row.cashOut,
      };
    }),
  };
}

/** Roll daily chart points into weeks (Monday) or months without another query. */
export function regroupDailyPoints(points: ChartPoint[], grain: ChartGrain): ChartPoint[] {
  if (grain === "day") return points;
  const totals = new Map<string, { cashIn: number; cashOut: number }>();
  const order: string[] = [];
  for (const point of points) {
    const key = bucketKey(point.key, grain);
    if (!totals.has(key)) order.push(key);
    const row = totals.get(key) ?? { cashIn: 0, cashOut: 0 };
    row.cashIn += point.cashIn;
    row.cashOut += point.cashOut;
    totals.set(key, row);
  }
  return order.map((key) => {
    const row = totals.get(key) ?? { cashIn: 0, cashOut: 0 };
    return {
      key,
      label: bucketLabel(key, grain),
      cashIn: row.cashIn,
      cashOut: row.cashOut,
      netCash: row.cashIn - row.cashOut,
    };
  });
}

function slices(events: ReportEvent[], categoryOf: (event: ReportEvent) => string): CategorySlice[] {
  const map = new Map<string, number>();
  for (const event of events) {
    const key = categoryOf(event);
    map.set(key, (map.get(key) ?? 0) + event.amount);
  }
  const total = [...map.values()].reduce((sum, amount) => sum + amount, 0);
  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function expenseBreakdown(events: ReportEvent[]): CategorySlice[] {
  return slices(
    dedupeEvents(events).filter((event) => event.kind === "expense"),
    (event) => event.category || "other_expense",
  );
}

export function incomeBreakdown(events: ReportEvent[]): CategorySlice[] {
  return slices(
    dedupeEvents(events).filter((event) => event.kind === "income" || event.kind === "interest"),
    (event) =>
      event.kind === "interest"
        ? LOAN_INTEREST_CATEGORY
        : event.category || "other_income",
  );
}

export function loansWithCollections(events: ReportEvent[]): {
  loanId: string;
  principal: number;
  interest: number;
}[] {
  const map = new Map<string, { principal: number; interest: number }>();
  for (const event of dedupeEvents(events)) {
    if (!event.loanId) continue;
    if (event.kind !== "principal" && event.kind !== "interest") continue;
    const row = map.get(event.loanId) ?? { principal: 0, interest: 0 };
    if (event.kind === "principal") row.principal += event.amount;
    else row.interest += event.amount;
    map.set(event.loanId, row);
  }
  return [...map.entries()]
    .map(([loanId, row]) => ({ loanId, ...row }))
    .sort((a, b) => b.principal + b.interest - (a.principal + a.interest));
}

export type ScheduleInput = {
  loanId: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
};

export function interestDueReport(schedules: ScheduleInput[], today: string) {
  const upcomingLimit = dayKey(addDays(parseDay(today), 7));
  let dueUnpaid = 0;
  const overdue: { loanId: string; dueDate: string; remaining: number }[] = [];
  const upcoming: { loanId: string; dueDate: string; remaining: number }[] = [];
  for (const schedule of schedules) {
    const due = vnDateKey(schedule.dueDate);
    const remaining = Math.max(schedule.amount - schedule.paidAmount, 0);
    if (!due || remaining <= 0) continue;
    if (due <= today) dueUnpaid += remaining;
    if (due < today) overdue.push({ loanId: schedule.loanId, dueDate: due, remaining });
    else if (due > today && due <= upcomingLimit) {
      upcoming.push({ loanId: schedule.loanId, dueDate: due, remaining });
    }
  }
  overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { dueUnpaid, overdue, upcoming };
}

export function buildAssetReport(input: {
  availableCash: number;
  otherAssets: number;
  manualGold: number;
  goldCost: number;
  goldEstimate: number;
  hasReferencePrice: boolean;
  lentCapital: number;
}) {
  const gold = input.hasReferencePrice
    ? input.goldEstimate + input.manualGold
    : input.goldCost + input.manualGold;
  return {
    cash: input.availableCash,
    other: input.otherAssets,
    gold,
    goldBasis: input.hasReferencePrice ? ("reference" as const) : ("cost" as const),
    lentCapital: input.lentCapital,
    totalAssets: input.availableCash + input.otherAssets + gold + input.lentCapital,
    netWorth: null,
    netWorthReason: "missing_liabilities" as const,
  };
}

export function buildNarrative(input: {
  summary: CashSummary;
  hasActivity: boolean;
  hasPrevious: boolean;
  netPercent: number | null;
  topExpense: { label: string; amount: number; percent: number } | null;
}): string[] {
  if (!input.hasActivity) return [];
  const lines: string[] = [];
  const money = (value: number) =>
    `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} ₫`;
  if (input.summary.netCash > 0) {
    lines.push(`Dòng tiền ròng dương ${money(input.summary.netCash)}.`);
  } else if (input.summary.netCash < 0) {
    lines.push(`Dòng tiền ròng âm ${money(Math.abs(input.summary.netCash))}.`);
  } else {
    lines.push("Dòng tiền ròng bằng 0.");
  }
  if (input.topExpense && input.topExpense.amount > 0) {
    lines.push(
      `${input.topExpense.label} là khoản chi lớn nhất (${money(input.topExpense.amount)}, ${input.topExpense.percent.toFixed(1)}%).`,
    );
  }
  if (input.hasPrevious && input.netPercent !== null && input.netPercent !== 0) {
    const direction = input.netPercent > 0 ? "tăng" : "giảm";
    lines.push(
      `Dòng tiền ròng ${direction} ${Math.abs(input.netPercent).toFixed(1)}% so với kỳ trước.`,
    );
  }
  if (input.summary.interestIncome > 0) {
    lines.push(`Đã thu lãi cho vay ${money(input.summary.interestIncome)}.`);
  }
  if (input.summary.principalCollected > 0) {
    lines.push(
      `Đã thu hồi gốc ${money(input.summary.principalCollected)}, không tính vào thu nhập.`,
    );
  }
  return lines;
}

export function resolveReportPreset(
  preset: ReportPreset,
  today: string,
  custom?: { from: string; to: string },
): { from: string; to: string } {
  const date = parseDay(today);
  if (preset === "this_month") {
    return { from: dayKey(startOfMonth(date)), to: dayKey(endOfMonth(date)) };
  }
  if (preset === "last_month") {
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    return { from: dayKey(startOfMonth(prev)), to: dayKey(endOfMonth(prev)) };
  }
  if (preset === "this_quarter") {
    return { from: dayKey(startOfQuarter(date)), to: dayKey(endOfQuarter(date)) };
  }
  if (preset === "last_quarter") {
    const prev = subQuarters(date, 1);
    return { from: dayKey(startOfQuarter(prev)), to: dayKey(endOfQuarter(prev)) };
  }
  if (preset === "this_year") {
    return { from: dayKey(startOfYear(date)), to: dayKey(endOfYear(date)) };
  }
  if (preset === "last_year") {
    const prev = subYears(date, 1);
    return { from: dayKey(startOfYear(prev)), to: dayKey(endOfYear(prev)) };
  }
  if (custom?.from && custom.to) {
    return custom.from <= custom.to
      ? { from: custom.from, to: custom.to }
      : { from: custom.to, to: custom.from };
  }
  return { from: dayKey(startOfMonth(date)), to: dayKey(endOfMonth(date)) };
}

export function previousEquivalentRange(from: string, to: string): { from: string; to: string } {
  const start = parseDay(from);
  const end = parseDay(to);
  const days = differenceInCalendarDays(end, start);
  const prevTo = subDays(start, 1);
  const prevFrom = subDays(prevTo, days);
  return { from: dayKey(prevFrom), to: dayKey(prevTo) };
}

export function filterEvents(
  events: ReportEvent[],
  query: {
    kind?: ReportFilterKind;
    category?: string;
    paymentMethod?: string;
    q?: string;
  },
): ReportEvent[] {
  const kinds = KIND_FILTER[query.kind ?? "all"];
  const needle = query.q?.trim().toLocaleLowerCase("vi") ?? "";
  return dedupeEvents(events).filter((event) => {
    if (kinds && !kinds.includes(event.kind)) return false;
    if (query.category) {
      const category =
        event.kind === "interest" ? LOAN_INTEREST_CATEGORY : event.category;
      if (category !== query.category) return false;
    }
    if (query.paymentMethod && event.paymentMethod !== query.paymentMethod) return false;
    if (needle) {
      const haystack = `${event.description ?? ""} ${event.note ?? ""}`.toLocaleLowerCase("vi");
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export function sortEvents(
  events: ReportEvent[],
  sort: "date" | "amount",
  dir: "asc" | "desc",
): ReportEvent[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...events].sort((a, b) => {
    if (sort === "amount") return (a.amount - b.amount) * sign;
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate * sign;
    return a.id.localeCompare(b.id) * sign;
  });
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const size = Math.min(50, Math.max(1, Math.floor(pageSize) || 20));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(pages, Math.max(1, Math.floor(page) || 1));
  const start = (current - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    page: current,
    pageSize: size,
    total,
    pages,
  };
}

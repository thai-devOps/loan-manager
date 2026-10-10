import {
  calculateAvailableCash,
  calculateGoldCost,
  calculateGoldEstimatedValue,
  calculateManualGoldAssets,
  calculateOtherAssets,
} from "./asset-calculations.js";
import { getRemainingPrincipal } from "./calculations.js";
import { todayDateInput } from "./date.js";
import {
  assetsCol,
  borrowersCol,
  financeCategoriesCol,
  financeTransactionsCol,
  goldPurchasesCol,
  assetSettingsCol,
  loansCol,
  schedulesCol,
  transactionsCol,
} from "./mongo.js";
import type { Transaction, TransactionType } from "./types.js";
import {
  buildAssetReport,
  buildNarrative,
  chartSeries,
  eventsInRange,
  expenseBreakdown,
  filterEvents,
  incomeBreakdown,
  interestDueReport,
  loansWithCollections,
  metricDelta,
  paginate,
  previousEquivalentRange,
  salaryCycles,
  sortEvents,
  summarize,
  vnDateKey,
  LOAN_INTEREST_CATEGORY,
  type ReportEvent,
  type ReportFilterKind,
  type ReportKind,
} from "../../shared/finance/report-math.js";

const ROW_CAP = 5000;

const LOAN_KIND: Record<TransactionType, ReportKind> = {
  DISBURSEMENT: "disbursement",
  INTEREST_PAYMENT: "interest",
  PRINCIPAL_PAYMENT: "principal",
};

const KIND_LABEL: Record<ReportKind, string> = {
  income: "Thu",
  expense: "Chi",
  interest: "Lãi cho vay",
  principal: "Thu gốc",
  disbursement: "Giải ngân",
};

export type ReportAccess = {
  loans: boolean;
  schedules: boolean;
  assets: boolean;
};

export type TransactionQuery = {
  from: string;
  to: string;
  kind?: ReportFilterKind;
  category?: string;
  paymentMethod?: string;
  q?: string;
  sort: "date" | "amount";
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
};

function isoStart(day: string): string {
  return new Date(`${day}T00:00:00+07:00`).toISOString();
}

function isoEnd(day: string): string {
  return new Date(`${day}T23:59:59.999+07:00`).toISOString();
}

function assertRange(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    throw new Error("Khoảng thời gian không hợp lệ");
  }
  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (span > 366 * 5) throw new Error("Khoảng thời gian không hợp lệ");
}

async function loadFinance(from: string, to: string): Promise<ReportEvent[]> {
  const rows = await (await financeTransactionsCol())
    .aggregate<{
      _id: string;
      type?: string;
      amount: number;
      date: string;
      category?: string;
      description?: string;
      paymentMethod?: string;
      note?: string;
      voided?: boolean;
    }>([
      { $match: { date: { $gte: from, $lte: to }, voided: { $ne: true } } },
      {
        $group: {
          _id: "$id",
          type: { $first: "$type" },
          amount: { $first: "$amount" },
          date: { $first: "$date" },
          category: { $first: "$category" },
          description: { $first: "$description" },
          paymentMethod: { $first: "$paymentMethod" },
          note: { $first: "$note" },
          voided: { $first: "$voided" },
        },
      },
      { $limit: ROW_CAP + 1 },
    ])
    .toArray();
  if (rows.length > ROW_CAP) throw new Error("Dữ liệu báo cáo quá lớn");
  return rows.flatMap((row) => {
    if (row.type !== "income" && row.type !== "expense") return [];
    return [
      {
        id: String(row._id),
        kind: row.type,
        amount: Number(row.amount),
        date: vnDateKey(String(row.date ?? "")),
        category: row.category ? String(row.category) : undefined,
        description: row.description ? String(row.description) : undefined,
        paymentMethod: row.paymentMethod ? String(row.paymentMethod) : undefined,
        note: row.note ? String(row.note) : undefined,
        voided: row.voided === true,
      },
    ];
  });
}

async function loadLoans(from: string, to: string): Promise<ReportEvent[]> {
  const rows = await (await transactionsCol())
    .aggregate<{
      _id: string;
      type: TransactionType;
      amount: number;
      transactionDate: string;
      loanId: string;
      note?: string;
      voided?: boolean;
    }>([
      {
        $match: {
          voided: { $ne: true },
          $or: [
            { transactionDate: { $gte: from, $lte: to } },
            { transactionDate: { $gte: isoStart(from), $lte: isoEnd(to) } },
          ],
        },
      },
      {
        $group: {
          _id: "$id",
          type: { $first: "$type" },
          amount: { $first: "$amount" },
          transactionDate: { $first: "$transactionDate" },
          loanId: { $first: "$loanId" },
          note: { $first: "$note" },
          voided: { $first: "$voided" },
        },
      },
      { $limit: ROW_CAP + 1 },
    ])
    .toArray();
  if (rows.length > ROW_CAP) throw new Error("Dữ liệu báo cáo quá lớn");
  return rows.flatMap((row) => {
    const kind = LOAN_KIND[row.type];
    if (!kind) return [];
    return [
      {
        id: `loan:${row._id}`,
        kind,
        amount: Number(row.amount),
        date: vnDateKey(String(row.transactionDate ?? "")),
        description: row.note ? String(row.note) : KIND_LABEL[kind],
        loanId: row.loanId ? String(row.loanId) : undefined,
        note: row.note ? String(row.note) : undefined,
        voided: row.voided === true,
      },
    ];
  });
}

async function loadEvents(from: string, to: string, includeLoans: boolean) {
  assertRange(from, to);
  const [finance, loans] = await Promise.all([
    loadFinance(from, to),
    includeLoans ? loadLoans(from, to) : Promise.resolve([]),
  ]);
  return eventsInRange([...finance, ...loans], from, to);
}

async function categoryNames(): Promise<Map<string, string>> {
  const rows = await (await financeCategoriesCol())
    .find({}, { projection: { key: 1, name: 1 } })
    .toArray();
  const map = new Map<string, string>();
  for (const row of rows) map.set(row.key, row.name);
  map.set(LOAN_INTEREST_CATEGORY, "Lãi cho vay");
  return map;
}

function labelOf(map: Map<string, string>, key: string): string {
  return map.get(key) ?? key;
}

async function loanNames(ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map<string, string>();
  const loans = await (await loansCol())
    .find({ id: { $in: unique } }, { projection: { id: 1, borrowerId: 1 } })
    .toArray();
  const borrowerIds = [...new Set(loans.map((loan) => loan.borrowerId))];
  const borrowers = await (await borrowersCol())
    .find({ id: { $in: borrowerIds } }, { projection: { id: 1, name: 1 } })
    .toArray();
  const borrowerName = new Map(borrowers.map((row) => [row.id, row.name]));
  return new Map(
    loans.map((loan) => [loan.id, borrowerName.get(loan.borrowerId) ?? "Khoản vay"]),
  );
}

async function outstandingPrincipal(): Promise<number> {
  const [loans, paid] = await Promise.all([
    (await loansCol()).find({ status: "ACTIVE" }, { projection: { id: 1, principalAmount: 1 } }).toArray(),
    (await transactionsCol())
      .aggregate<{ _id: string; amount: number }>([
        { $match: { type: "PRINCIPAL_PAYMENT", voided: { $ne: true } } },
        {
          $group: {
            _id: "$id",
            loanId: { $first: "$loanId" },
            amount: { $first: "$amount" },
          },
        },
        { $group: { _id: "$loanId", amount: { $sum: "$amount" } } },
      ])
      .toArray(),
  ]);
  const paidByLoan = new Map(paid.map((row) => [String(row._id), row.amount]));
  return loans.reduce((sum, loan) => {
    const principalPaid = paidByLoan.get(loan.id) ?? 0;
    const synthetic: Transaction[] = [
      {
        id: `${loan.id}:principal`,
        loanId: loan.id,
        type: "PRINCIPAL_PAYMENT",
        amount: principalPaid,
        transactionDate: "1970-01-01",
        createdAt: "1970-01-01T00:00:00.000Z",
      },
    ];
    return sum + getRemainingPrincipal(loan.principalAmount, synthetic);
  }, 0);
}

async function loanBlock(events: ReportEvent[], includeSchedules: boolean) {
  const summary = summarize(events);
  const [outstanding, schedules] = await Promise.all([
    outstandingPrincipal(),
    includeSchedules
      ? (await schedulesCol())
          .find({ $expr: { $lt: ["$paidAmount", "$amount"] } })
          .project({ loanId: 1, amount: 1, paidAmount: 1, dueDate: 1 })
          .toArray()
      : Promise.resolve([]),
  ]);
  const today = vnDateKey(new Date().toISOString());
  const due = interestDueReport(
    schedules.map((row) => ({
      loanId: String(row.loanId),
      amount: Number(row.amount),
      paidAmount: Number(row.paidAmount),
      dueDate: String(row.dueDate),
    })),
    today,
  );
  const activity = loansWithCollections(events).slice(0, 20);
  const names = await loanNames([
    ...activity.map((row) => row.loanId),
    ...due.overdue.map((row) => row.loanId),
    ...due.upcoming.map((row) => row.loanId),
  ]);
  const name = (loanId: string) => names.get(loanId) ?? "Khoản vay";
  return {
    disbursed: summary.disbursed,
    principalCollected: summary.principalCollected,
    interestCollected: summary.interestIncome,
    outstanding,
    dueUnpaid: includeSchedules ? due.dueUnpaid : null,
    overdue: due.overdue.slice(0, 8).map((row) => ({ ...row, borrowerName: name(row.loanId) })),
    upcoming: due.upcoming.slice(0, 8).map((row) => ({ ...row, borrowerName: name(row.loanId) })),
    activity: activity.map((row) => ({ ...row, borrowerName: name(row.loanId) })),
  };
}

async function assetBlock() {
  const [assets, purchases, settings] = await Promise.all([
    (await assetsCol()).find({}).toArray(),
    (await goldPurchasesCol()).find({}).toArray(),
    (await assetSettingsCol()).findOne({ id: "default" }),
  ]);
  const prices = settings?.goldReferencePricePerChi ?? { "9999": 0, "18k": 0, other: 0 };
  const hasReferencePrice = prices["9999"] > 0 || prices["18k"] > 0 || prices.other > 0;
  return buildAssetReport({
    availableCash: calculateAvailableCash(assets),
    otherAssets: calculateOtherAssets(assets),
    manualGold: calculateManualGoldAssets(assets),
    goldCost: calculateGoldCost(purchases),
    goldEstimate: calculateGoldEstimatedValue(purchases, prices),
    hasReferencePrice,
    lentCapital: await outstandingPrincipal(),
  });
}

function deltas(current: ReturnType<typeof summarize>, previous: ReturnType<typeof summarize>, hasPrevious: boolean) {
  return {
    hasPrevious,
    cashIn: metricDelta(current.cashIn, previous.cashIn, hasPrevious),
    cashOut: metricDelta(current.cashOut, previous.cashOut, hasPrevious),
    netCash: metricDelta(current.netCash, previous.netCash, hasPrevious),
    actualIncome: metricDelta(current.actualIncome, previous.actualIncome, hasPrevious),
    interestIncome: metricDelta(current.interestIncome, previous.interestIncome, hasPrevious),
  };
}

async function earliestDay(includeLoans: boolean): Promise<string> {
  const [finance] = await (await financeTransactionsCol())
    .aggregate<{ date?: string }>([
      { $match: { voided: { $ne: true } } },
      { $group: { _id: null, date: { $min: "$date" } } },
    ])
    .toArray();
  const days = [finance?.date ? vnDateKey(String(finance.date)) : ""];
  if (includeLoans) {
    const [loan] = await (await transactionsCol())
      .aggregate<{ date?: string }>([
        { $match: { voided: { $ne: true } } },
        { $group: { _id: null, date: { $min: "$transactionDate" } } },
      ])
      .toArray();
    days.push(loan?.date ? vnDateKey(String(loan.date)) : "");
  }
  return days.filter(Boolean).sort()[0] ?? "";
}

export async function buildSalaryCycles(payday: number, access: ReportAccess) {
  const today = todayDateInput();
  const from = await earliestDay(access.loans);
  if (!from || from > today) return salaryCycles([], payday, today, access.loans);
  const events = await loadEvents(from, today, access.loans);
  return salaryCycles(events, payday, today, access.loans);
}

export async function buildOverview(from: string, to: string, access: ReportAccess) {
  const previousRange = previousEquivalentRange(from, to);
  const [events, previousEvents, names] = await Promise.all([
    loadEvents(from, to, access.loans),
    loadEvents(previousRange.from, previousRange.to, access.loans),
    categoryNames(),
  ]);
  const summary = summarize(events);
  const previous = summarize(previousEvents);
  const hasPrevious = previousEvents.length > 0;
  const expenses = expenseBreakdown(events);
  const income = incomeBreakdown(events);
  const top = expenses[0];
  const comparison = deltas(summary, previous, hasPrevious);
  const [loans, assets] = await Promise.all([
    access.loans ? loanBlock(events, access.schedules) : Promise.resolve(null),
    access.assets ? assetBlock() : Promise.resolve(null),
  ]);
  return {
    from,
    to,
    previous: previousRange,
    summary,
    comparison,
    series: chartSeries(events, from, to),
    daily: chartSeries(events, from, to, "day").points,
    expenses: expenses.map((row) => ({ ...row, label: labelOf(names, row.category) })),
    income: income.map((row) => ({ ...row, label: labelOf(names, row.category) })),
    narrative: buildNarrative({
      summary,
      hasActivity: events.length > 0,
      hasPrevious,
      netPercent: comparison.netCash.percent,
      topExpense: top
        ? { label: labelOf(names, top.category), amount: top.amount, percent: top.percent }
        : null,
    }),
    loans,
    assets,
  };
}

function listedRows(events: ReportEvent[], query: TransactionQuery) {
  return sortEvents(
    filterEvents(events, {
      kind: query.kind,
      category: query.category,
      paymentMethod: query.paymentMethod,
      q: query.q,
    }),
    query.sort,
    query.dir,
  );
}

export async function listReportTransactions(query: TransactionQuery, access: ReportAccess) {
  const events = await loadEvents(query.from, query.to, access.loans);
  const page = paginate(listedRows(events, query), query.page, query.pageSize);
  const names = await loanNames(
    page.rows.flatMap((row) => (row.loanId ? [row.loanId] : [])),
  );
  return {
    ...page,
    rows: page.rows.map((row) => ({
      ...row,
      source: row.loanId ? "loan" : "finance",
      borrowerName: row.loanId ? names.get(row.loanId) ?? null : null,
    })),
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export async function exportReportCsv(query: TransactionQuery, access: ReportAccess) {
  const events = await loadEvents(query.from, query.to, access.loans);
  const rows = listedRows(events, { ...query, page: 1, pageSize: 50 });
  if (rows.length > ROW_CAP) throw new Error("Dữ liệu báo cáo quá lớn");
  const names = await categoryNames();
  const borrowers = await loanNames(rows.flatMap((row) => (row.loanId ? [row.loanId] : [])));
  const header = ["Ngày", "Nội dung", "Danh mục", "Loại", "Phương thức", "Số tiền", "Khoản vay"];
  const lines = rows.map((row) => {
    const category =
      row.kind === "interest"
        ? "Lãi cho vay"
        : row.kind === "principal"
          ? "Thu gốc"
          : row.kind === "disbursement"
            ? "Giải ngân"
            : labelOf(names, row.category ?? "");
    const method =
      row.paymentMethod === "cash"
        ? "Tiền mặt"
        : row.paymentMethod === "transfer"
          ? "Chuyển khoản"
          : "";
    return [
      row.date,
      row.description ?? "",
      category,
      KIND_LABEL[row.kind],
      method,
      row.amount,
      row.loanId ? borrowers.get(row.loanId) ?? row.loanId : "",
    ]
      .map(csvCell)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

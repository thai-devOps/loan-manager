import type {
  ChartPoint,
  MetricDelta,
  ReportFilterKind,
  ReportKind,
  SalaryCycleReport,
} from "@shared/finance/report-math";

export type { SalaryCycleReport };

export type ReportSlice = {
  category: string;
  label: string;
  amount: number;
  percent: number;
};

export type ReportSummary = {
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

export type ReportLoanRow = {
  loanId: string;
  borrowerName: string;
  dueDate?: string;
  remaining?: number;
  principal?: number;
  interest?: number;
};

export type FinanceReportOverview = {
  from: string;
  to: string;
  previous: { from: string; to: string };
  summary: ReportSummary;
  comparison: {
    hasPrevious: boolean;
    cashIn: MetricDelta;
    cashOut: MetricDelta;
    netCash: MetricDelta;
    actualIncome: MetricDelta;
    interestIncome: MetricDelta;
  };
  series: { grain: "day" | "week" | "month"; points: ChartPoint[] };
  daily: ChartPoint[];
  expenses: ReportSlice[];
  income: ReportSlice[];
  narrative: string[];
  loans: {
    disbursed: number;
    principalCollected: number;
    interestCollected: number;
    outstanding: number;
    dueUnpaid: number | null;
    overdue: ReportLoanRow[];
    upcoming: ReportLoanRow[];
    activity: ReportLoanRow[];
  } | null;
  assets: {
    cash: number;
    other: number;
    gold: number;
    goldBasis: "reference" | "cost";
    lentCapital: number;
    totalAssets: number;
    netWorth: null;
    netWorthReason: "missing_liabilities";
  } | null;
};

export type FinanceReportTransaction = {
  id: string;
  source: "finance" | "loan";
  kind: ReportKind;
  amount: number;
  date: string;
  description?: string;
  category?: string;
  paymentMethod?: string;
  loanId?: string;
  note?: string;
  borrowerName: string | null;
};

export type FinanceReportTransactions = {
  rows: FinanceReportTransaction[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
};

export type FinanceReportTransactionQuery = {
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

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import {
  buildOverview,
  buildSalaryCycles,
  exportReportCsv,
  listReportTransactions,
  type ReportAccess,
  type TransactionQuery,
} from "../../_lib/finance-report.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import {
  canExportFinanceReport,
  canIncludeAssets,
  canIncludeLoans,
  canIncludeSchedules,
  type ReportFilterKind,
} from "../../../shared/finance/report-math.js";

const KINDS = new Set<ReportFilterKind>([
  "all",
  "income",
  "expense",
  "interest",
  "principal",
  "disbursement",
  "cash_in",
  "cash_out",
  "actual_income",
]);

function queryValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readQuery(req: VercelRequest): TransactionQuery & { section: string } {
  const from = queryValue(req.query.from);
  const to = queryValue(req.query.to);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new Error("Khoảng thời gian không hợp lệ");
  }
  const kindRaw = queryValue(req.query.kind);
  const kind = KINDS.has(kindRaw as ReportFilterKind)
    ? (kindRaw as ReportFilterKind)
    : undefined;
  const sort = queryValue(req.query.sort) === "amount" ? "amount" : "date";
  const dir = queryValue(req.query.dir) === "asc" ? "asc" : "desc";
  const page = Number(queryValue(req.query.page) || "1");
  const pageSize = Number(queryValue(req.query.pageSize) || "20");
  const q = queryValue(req.query.q).slice(0, 80);
  const category = queryValue(req.query.category).slice(0, 80);
  const paymentMethod = queryValue(req.query.paymentMethod).slice(0, 40);
  return {
    section: queryValue(req.query.section) || "overview",
    from,
    to,
    kind,
    category: category || undefined,
    paymentMethod: paymentMethod || undefined,
    q: q || undefined,
    sort,
    dir,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 20,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const auth = await requirePermission(req, res, PERMISSIONS.FINANCE_TRANSACTION_VIEW);
    if (!auth) return;

    const access: ReportAccess = {
      loans: canIncludeLoans(auth.permissions, auth.roleCodes),
      schedules: canIncludeSchedules(auth.permissions, auth.roleCodes),
      assets: canIncludeAssets(auth.permissions, auth.roleCodes),
    };
    const section = queryValue(req.query.section) || "overview";
    if (section === "cycles") {
      const payday = Number(queryValue(req.query.payday));
      if (!Number.isInteger(payday) || payday < 1 || payday > 28) {
        throw new Error("Ngày lĩnh lương không hợp lệ");
      }
      res.status(200).json(await buildSalaryCycles(payday, access));
      return;
    }

    const query = readQuery(req);

    if (query.section === "overview") {
      res.status(200).json(await buildOverview(query.from, query.to, access));
      return;
    }
    if (query.section === "transactions") {
      res.status(200).json(await listReportTransactions(query, access));
      return;
    }
    if (query.section === "export") {
      if (!canExportFinanceReport(auth.permissions, auth.roleCodes)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const csv = await exportReportCsv(query, access);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bao-cao-${query.from}-${query.to}.csv"`,
      );
      res.status(200).end(`\uFEFF${csv}`);
      return;
    }
    throw new Error("Loại báo cáo không hợp lệ");
  });
}

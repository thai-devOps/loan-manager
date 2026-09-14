import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../_lib/auth.js";
import {
  buildAllocation,
  calculateAvailableCash,
  calculateGoldCost,
  calculateGoldEstimatedValue,
  calculateGoldQuantityByType,
  calculateLentCapital,
  calculateManualGoldAssets,
  calculateOtherAssets,
  calculateTotalAssets,
  currentMonthKey,
  DEFAULT_SETTINGS,
  phanToChi,
  PLAN_ID,
  SETTINGS_ID,
} from "../_lib/asset-calculations.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../_lib/http.js";
import {
  assetSettingsCol,
  assetSnapshotsCol,
  assetsCol,
  goldPlansCol,
  goldPurchasesCol,
  loansCol,
  stripDoc,
  transactionsCol,
} from "../_lib/mongo.js";
import type {
  AssetSettings,
  AssetSnapshot,
  GoldPlan,
  GoldPurchase,
  GoldType,
  ManualAsset,
  ManualAssetType,
} from "../_lib/types.js";

const ASSET_TYPES = new Set<ManualAssetType>([
  "cash",
  "bank",
  "wallet",
  "gold",
  "other",
]);
const GOLD_TYPES = new Set<GoldType>(["9999", "18k", "other"]);

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function resourceOf(req: VercelRequest): string {
  const r = req.query.resource;
  return typeof r === "string" && r ? r : "summary";
}

function idOf(req: VercelRequest): string {
  return typeof req.query.id === "string" ? req.query.id : "";
}

async function getOrCreateSettings(): Promise<AssetSettings> {
  const col = await assetSettingsCol();
  const existing = await col.findOne({ id: SETTINGS_ID });
  if (existing) return existing;
  const now = new Date().toISOString();
  const row: AssetSettings = {
    _id: SETTINGS_ID,
    ...DEFAULT_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(row);
  return row;
}

async function computeSummaryParts() {
  const [loans, transactions, assets, purchases, settings] = await Promise.all([
    (await loansCol()).find({}).toArray(),
    (await transactionsCol()).find({}).toArray(),
    (await assetsCol()).find({}).toArray(),
    (await goldPurchasesCol()).find({}).toArray(),
    getOrCreateSettings(),
  ]);

  const lentCapital = calculateLentCapital(loans, transactions);
  const availableCash = calculateAvailableCash(assets);
  const otherAssets = calculateOtherAssets(assets);
  const manualGold = calculateManualGoldAssets(assets);
  const goldFromPurchases = calculateGoldEstimatedValue(
    purchases,
    settings.goldReferencePricePerChi,
  );
  const goldValue = goldFromPurchases + manualGold;
  const goldCost = calculateGoldCost(purchases);
  const qtyByType = calculateGoldQuantityByType(purchases);
  const totalPhan =
    qtyByType["9999"] + qtyByType["18k"] + qtyByType.other;
  const allocation = buildAllocation({
    lentCapital,
    availableCash,
    otherAssets,
    goldValue,
  });

  return {
    lentCapital,
    availableCash,
    otherAssets,
    goldValue,
    goldCost,
    goldDifference: goldValue - goldCost,
    totalGoldPhan: totalPhan,
    totalGoldChi: phanToChi(totalPhan),
    quantityByType: qtyByType,
    totalAssets: calculateTotalAssets({
      lentCapital,
      availableCash,
      otherAssets,
      goldValue,
    }),
    allocation,
    settings: stripDoc(settings),
    assets: assets.map((a) => stripDoc(a)),
    purchasesCount: purchases.length,
  };
}

async function upsertMonthSnapshot(): Promise<void> {
  const parts = await computeSummaryParts();
  const month = currentMonthKey();
  const col = await assetSnapshotsCol();
  const now = new Date().toISOString();
  const existing = await col.findOne({ month });
  if (existing) {
    await col.updateOne(
      { month },
      {
        $set: {
          totalAssets: parts.totalAssets,
          lentCapital: parts.lentCapital,
          availableCash: parts.availableCash,
          otherAssets: parts.otherAssets,
          goldValue: parts.goldValue,
          updatedAt: now,
        },
      },
    );
    return;
  }
  const id = randomUUID();
  const row: AssetSnapshot = {
    _id: id,
    id,
    month,
    totalAssets: parts.totalAssets,
    lentCapital: parts.lentCapital,
    availableCash: parts.availableCash,
    otherAssets: parts.otherAssets,
    goldValue: parts.goldValue,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(row);
}

function validateAssetBody(body: {
  name?: string;
  type?: string;
  value?: number;
  valuationDate?: string;
  note?: string;
  goldDetails?: {
    goldType?: string;
    quantityInPhan?: number;
    purchasePricePerChi?: number;
    totalCost?: number;
    seller?: string;
  };
}): Omit<ManualAsset, "_id" | "id" | "createdAt" | "updatedAt"> {
  const name = (body.name ?? "").trim();
  if (!name) throw new Error("Vui lòng nhập tên tài sản");
  const type = body.type as ManualAssetType;
  if (!ASSET_TYPES.has(type)) throw new Error("Loại tài sản không hợp lệ");
  const value = Number(body.value);
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error("Giá trị phải là số nguyên không âm");
  }
  const valuationDate = (body.valuationDate ?? "").trim();
  if (!isValidDate(valuationDate)) throw new Error("Ngày cập nhật không hợp lệ");

  if (type !== "gold") {
    return {
      name,
      type,
      value,
      valuationDate,
      note: body.note?.trim() || undefined,
    };
  }

  const goldType = body.goldDetails?.goldType as GoldType | undefined;
  if (!goldType || !GOLD_TYPES.has(goldType)) {
    throw new Error("Vui lòng chọn loại vàng");
  }
  const quantityInPhan = Number(body.goldDetails?.quantityInPhan);
  if (
    !Number.isFinite(quantityInPhan) ||
    quantityInPhan <= 0 ||
    !Number.isInteger(quantityInPhan)
  ) {
    throw new Error("Khối lượng vàng phải là số phân nguyên dương");
  }
  const purchasePricePerChi = Number(body.goldDetails?.purchasePricePerChi);
  if (
    !Number.isFinite(purchasePricePerChi) ||
    purchasePricePerChi < 0 ||
    !Number.isInteger(purchasePricePerChi)
  ) {
    throw new Error("Giá mua / chỉ không hợp lệ");
  }
  const expected = Math.round(phanToChi(quantityInPhan) * purchasePricePerChi);
  let totalCost = Number(body.goldDetails?.totalCost);
  if (!Number.isFinite(totalCost) || !Number.isInteger(totalCost) || totalCost < 0) {
    totalCost = expected;
  }
  if (value <= 0) {
    throw new Error("Giá trị ước tính hiện tại phải lớn hơn 0");
  }

  return {
    name,
    type,
    value,
    valuationDate,
    note: body.note?.trim() || undefined,
    goldDetails: {
      goldType,
      quantityInPhan,
      purchasePricePerChi,
      totalCost,
      seller: body.goldDetails?.seller?.trim() || undefined,
    },
  };
}

function validatePurchaseBody(body: {
  type?: string;
  quantityInPhan?: number;
  purchasePricePerChi?: number;
  totalCost?: number;
  purchaseDate?: string;
  seller?: string;
  note?: string;
}): Omit<GoldPurchase, "_id" | "id" | "createdAt" | "updatedAt"> {
  const type = body.type as GoldType;
  if (!GOLD_TYPES.has(type)) throw new Error("Loại vàng không hợp lệ");
  const quantityInPhan = Number(body.quantityInPhan);
  if (
    !Number.isFinite(quantityInPhan) ||
    quantityInPhan <= 0 ||
    !Number.isInteger(quantityInPhan)
  ) {
    throw new Error("Khối lượng phải là số phân nguyên dương");
  }
  const purchasePricePerChi = Number(body.purchasePricePerChi);
  if (
    !Number.isFinite(purchasePricePerChi) ||
    purchasePricePerChi < 0 ||
    !Number.isInteger(purchasePricePerChi)
  ) {
    throw new Error("Giá mua / chỉ không hợp lệ");
  }
  const expected = Math.round(phanToChi(quantityInPhan) * purchasePricePerChi);
  let totalCost = Number(body.totalCost);
  if (!Number.isFinite(totalCost) || !Number.isInteger(totalCost) || totalCost < 0) {
    totalCost = expected;
  } else if (Math.abs(totalCost - expected) > 1 && purchasePricePerChi > 0) {
    // Allow manual override but keep reasonable consistency (±1 VND rounding)
    if (totalCost === 0 && expected > 0) totalCost = expected;
  }
  const purchaseDate = (body.purchaseDate ?? "").trim();
  if (!isValidDate(purchaseDate)) throw new Error("Ngày mua không hợp lệ");
  return {
    type,
    quantityInPhan,
    purchasePricePerChi,
    totalCost,
    purchaseDate,
    seller: body.seller?.trim() || undefined,
    note: body.note?.trim() || undefined,
  };
}

function validatePlanBody(body: {
  targetAmount?: number;
  monthlyBudget?: number;
  plannedPurchaseDay?: number;
  startMonth?: string;
  endMonth?: string;
  status?: string;
}): Omit<GoldPlan, "_id" | "id" | "createdAt" | "updatedAt"> {
  const targetAmount = Number(body.targetAmount);
  const monthlyBudget = Number(body.monthlyBudget);
  const plannedPurchaseDay = Number(body.plannedPurchaseDay);
  if (!Number.isInteger(targetAmount) || targetAmount <= 0) {
    throw new Error("Mục tiêu tổng phải lớn hơn 0");
  }
  if (!Number.isInteger(monthlyBudget) || monthlyBudget <= 0) {
    throw new Error("Ngân sách tháng phải lớn hơn 0");
  }
  if (
    !Number.isInteger(plannedPurchaseDay) ||
    plannedPurchaseDay < 1 ||
    plannedPurchaseDay > 28
  ) {
    throw new Error("Ngày dự kiến mua phải từ 1–28");
  }
  const startMonth = (body.startMonth ?? "").trim();
  const endMonth = (body.endMonth ?? "").trim();
  if (!isValidMonth(startMonth) || !isValidMonth(endMonth)) {
    throw new Error("Thời gian bắt đầu/kết thúc không hợp lệ");
  }
  if (endMonth < startMonth) {
    throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
  }
  const status =
    body.status === "paused" || body.status === "completed"
      ? body.status
      : "active";
  return {
    targetAmount,
    monthlyBudget,
    plannedPurchaseDay,
    startMonth,
    endMonth,
    status,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;
    const resource = resourceOf(req);

    // ─── SUMMARY ───────────────────────────────────────────
    if (resource === "summary") {
      if (req.method !== "GET") {
        methodNotAllowed(res, ["GET"]);
        return;
      }
      const parts = await computeSummaryParts();
      const plan = await (await goldPlansCol()).findOne({ id: PLAN_ID });
      res.status(200).json({
        totalAssets: parts.totalAssets,
        lentCapital: parts.lentCapital,
        availableCash: parts.availableCash,
        otherAssets: parts.otherAssets,
        goldValue: parts.goldValue,
        goldCost: parts.goldCost,
        goldDifference: parts.goldDifference,
        totalGoldPhan: parts.totalGoldPhan,
        totalGoldChi: parts.totalGoldChi,
        quantityByType: parts.quantityByType,
        allocation: parts.allocation,
        settings: parts.settings,
        plan: plan ? stripDoc(plan) : null,
        purchasesCount: parts.purchasesCount,
      });
      return;
    }

    // ─── ALLOCATION (same numbers + targets) ───────────────
    if (resource === "allocation") {
      if (req.method !== "GET") {
        methodNotAllowed(res, ["GET"]);
        return;
      }
      const parts = await computeSummaryParts();
      res.status(200).json({
        ...parts.allocation,
        targets: parts.settings.allocationTargets ?? null,
      });
      return;
    }

    // ─── SETTINGS ──────────────────────────────────────────
    if (resource === "settings") {
      const col = await assetSettingsCol();
      if (req.method === "GET") {
        res.status(200).json(stripDoc(await getOrCreateSettings()));
        return;
      }
      if (req.method === "PATCH" || req.method === "PUT") {
        const body = readJsonBody<{
          goldReferencePricePerChi?: {
            "9999"?: number;
            "18k"?: number;
            other?: number;
          };
          allocationTargets?: {
            lending?: number;
            reserve?: number;
            gold?: number;
          } | null;
        }>(req);
        await getOrCreateSettings();
        const $set: Record<string, unknown> = {
          updatedAt: new Date().toISOString(),
        };
        if (body.goldReferencePricePerChi) {
          const p = body.goldReferencePricePerChi;
          for (const key of ["9999", "18k", "other"] as const) {
            if (p[key] !== undefined) {
              const n = Number(p[key]);
              if (!Number.isInteger(n) || n < 0) {
                res.status(400).json({ error: "Giá tham chiếu không hợp lệ" });
                return;
              }
              $set[`goldReferencePricePerChi.${key}`] = n;
            }
          }
        }
        if (body.allocationTargets === null) {
          // cleared via $unset below
        } else if (body.allocationTargets) {
          const lending = Number(body.allocationTargets.lending);
          const reserve = Number(body.allocationTargets.reserve);
          const gold = Number(body.allocationTargets.gold);
          if (
            ![lending, reserve, gold].every(
              (n) => Number.isFinite(n) && n >= 0 && n <= 100,
            )
          ) {
            res.status(400).json({ error: "Mục tiêu phân bổ không hợp lệ" });
            return;
          }
          const sum = lending + reserve + gold;
          if (Math.abs(sum - 100) > 0.5) {
            res
              .status(400)
              .json({ error: "Tổng mục tiêu phân bổ phải bằng 100%" });
            return;
          }
          $set.allocationTargets = { lending, reserve, gold };
        }
        const result = await col.findOneAndUpdate(
          { id: SETTINGS_ID },
          body.allocationTargets === null
            ? { $set, $unset: { allocationTargets: "" } }
            : { $set },
          { returnDocument: "after" },
        );
        if (!result) {
          res.status(404).json({ error: "Không tìm thấy cài đặt" });
          return;
        }
        await upsertMonthSnapshot();
        res.status(200).json(stripDoc(result));
        return;
      }
      methodNotAllowed(res, ["GET", "PATCH", "PUT"]);
      return;
    }

    // ─── ASSETS CRUD ───────────────────────────────────────
    if (resource === "assets") {
      const col = await assetsCol();
      if (req.method === "GET") {
        const rows = await col.find({}).sort({ updatedAt: -1 }).toArray();
        res.status(200).json(rows.map((r) => stripDoc(r)));
        return;
      }
      if (req.method === "POST") {
        try {
          const parsed = validateAssetBody(readJsonBody(req));
          const now = new Date().toISOString();
          const id = randomUUID();
          const row: ManualAsset = {
            _id: id,
            id,
            ...parsed,
            createdAt: now,
            updatedAt: now,
          };
          await col.insertOne(row);
          await upsertMonthSnapshot();
          res.status(201).json(stripDoc(row));
        } catch (e) {
          res.status(400).json({
            error: e instanceof Error ? e.message : "Dữ liệu không hợp lệ",
          });
        }
        return;
      }
      if (req.method === "PATCH") {
        const id = idOf(req);
        if (!id) {
          res.status(400).json({ error: "Missing id" });
          return;
        }
        try {
          const parsed = validateAssetBody(readJsonBody(req));
          const update =
            parsed.type === "gold"
              ? { $set: { ...parsed, updatedAt: new Date().toISOString() } }
              : {
                  $set: { ...parsed, updatedAt: new Date().toISOString() },
                  $unset: { goldDetails: "" },
                };
          const result = await col.findOneAndUpdate({ id }, update, {
            returnDocument: "after",
          });
          if (!result) {
            res.status(404).json({ error: "Không tìm thấy tài sản" });
            return;
          }
          await upsertMonthSnapshot();
          res.status(200).json(stripDoc(result));
        } catch (e) {
          res.status(400).json({
            error: e instanceof Error ? e.message : "Dữ liệu không hợp lệ",
          });
        }
        return;
      }
      if (req.method === "DELETE") {
        const id = idOf(req);
        if (!id) {
          res.status(400).json({ error: "Missing id" });
          return;
        }
        const result = await col.deleteOne({ id });
        if (result.deletedCount === 0) {
          res.status(404).json({ error: "Không tìm thấy tài sản" });
          return;
        }
        await upsertMonthSnapshot();
        res.status(200).json({ ok: true });
        return;
      }
      methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE"]);
      return;
    }

    // ─── GOLD PURCHASES ────────────────────────────────────
    if (resource === "gold-purchases") {
      const col = await goldPurchasesCol();
      if (req.method === "GET") {
        const rows = await col
          .find({})
          .sort({ purchaseDate: -1, createdAt: -1 })
          .toArray();
        res.status(200).json(rows.map((r) => stripDoc(r)));
        return;
      }
      if (req.method === "POST") {
        try {
          const parsed = validatePurchaseBody(readJsonBody(req));
          const now = new Date().toISOString();
          const id = randomUUID();
          const row: GoldPurchase = {
            _id: id,
            id,
            ...parsed,
            createdAt: now,
            updatedAt: now,
          };
          await col.insertOne(row);
          await upsertMonthSnapshot();
          res.status(201).json(stripDoc(row));
        } catch (e) {
          res.status(400).json({
            error: e instanceof Error ? e.message : "Dữ liệu không hợp lệ",
          });
        }
        return;
      }
      if (req.method === "PATCH") {
        const id = idOf(req);
        if (!id) {
          res.status(400).json({ error: "Missing id" });
          return;
        }
        try {
          const parsed = validatePurchaseBody(readJsonBody(req));
          const result = await col.findOneAndUpdate(
            { id },
            { $set: { ...parsed, updatedAt: new Date().toISOString() } },
            { returnDocument: "after" },
          );
          if (!result) {
            res.status(404).json({ error: "Không tìm thấy lần mua" });
            return;
          }
          await upsertMonthSnapshot();
          res.status(200).json(stripDoc(result));
        } catch (e) {
          res.status(400).json({
            error: e instanceof Error ? e.message : "Dữ liệu không hợp lệ",
          });
        }
        return;
      }
      if (req.method === "DELETE") {
        const id = idOf(req);
        if (!id) {
          res.status(400).json({ error: "Missing id" });
          return;
        }
        const result = await col.deleteOne({ id });
        if (result.deletedCount === 0) {
          res.status(404).json({ error: "Không tìm thấy lần mua" });
          return;
        }
        await upsertMonthSnapshot();
        res.status(200).json({ ok: true });
        return;
      }
      methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE"]);
      return;
    }

    // ─── GOLD PLAN ─────────────────────────────────────────
    if (resource === "gold-plan") {
      const col = await goldPlansCol();
      if (req.method === "GET") {
        const plan = await col.findOne({ id: PLAN_ID });
        res.status(200).json(plan ? stripDoc(plan) : null);
        return;
      }
      if (req.method === "PUT" || req.method === "PATCH" || req.method === "POST") {
        try {
          const parsed = validatePlanBody(readJsonBody(req));
          const now = new Date().toISOString();
          const existing = await col.findOne({ id: PLAN_ID });
          if (existing) {
            const result = await col.findOneAndUpdate(
              { id: PLAN_ID },
              { $set: { ...parsed, updatedAt: now } },
              { returnDocument: "after" },
            );
            res.status(200).json(stripDoc(result!));
          } else {
            const row: GoldPlan = {
              _id: PLAN_ID,
              id: PLAN_ID,
              ...parsed,
              createdAt: now,
              updatedAt: now,
            };
            await col.insertOne(row);
            res.status(201).json(stripDoc(row));
          }
        } catch (e) {
          res.status(400).json({
            error: e instanceof Error ? e.message : "Dữ liệu không hợp lệ",
          });
        }
        return;
      }
      if (req.method === "DELETE") {
        await col.deleteOne({ id: PLAN_ID });
        res.status(200).json({ ok: true });
        return;
      }
      methodNotAllowed(res, ["GET", "POST", "PUT", "PATCH", "DELETE"]);
      return;
    }

    // ─── SNAPSHOTS ─────────────────────────────────────────
    if (resource === "snapshots") {
      if (req.method !== "GET") {
        methodNotAllowed(res, ["GET"]);
        return;
      }
      const monthsParam =
        typeof req.query.months === "string" ? Number(req.query.months) : 12;
      const months = [6, 12].includes(monthsParam) ? monthsParam : 12;
      const rows = await (await assetSnapshotsCol())
        .find({})
        .sort({ month: -1 })
        .limit(months)
        .toArray();
      res.status(200).json(rows.map((r) => stripDoc(r)).reverse());
      return;
    }

    res.status(400).json({ error: "Unknown resource" });
  });
}

import { getDb } from "@/db/database";
import {
  enqueueAndKick,
  isActiveRecord,
  newId,
  nowIso,
} from "@/db/repositories/baseRepository";
import type {
  LocalAssetSettings,
  LocalGoldPlan,
  LocalGoldPurchase,
  LocalManualAsset,
} from "@/db/schema";
import {
  buildAllocation,
  calculateAvailableCash,
  calculateGoldCost,
  calculateManualGoldAssets,
  calculateOtherAssets,
} from "@/features/assets/lib/calculations";
import { getRemainingPrincipal } from "@/lib/calculations";
import type {
  AssetAllocation,
  AssetSettings,
  AssetSummary,
  GoldPlan,
  GoldPurchase,
  GoldType,
  ManualAsset,
} from "@/types/assets";
import type { Loan } from "@/types/loan";
import type { Transaction } from "@/types/transaction";

const SETTINGS_ID = "default";
const PLAN_ID = "default";

function strip<T extends { deletedAt?: string | null }>(row: T): Omit<T, "deletedAt"> {
  const { deletedAt: _d, ...rest } = row;
  void _d;
  return rest;
}

function phanToChi(phan: number): number {
  return phan / 10;
}

function goldQtyByType(
  purchases: GoldPurchase[],
): Record<GoldType, number> {
  const result: Record<GoldType, number> = {
    "9999": 0,
    "18k": 0,
    other: 0,
  };
  for (const p of purchases) {
    result[p.type] += p.quantityInPhan;
  }
  return result;
}

function goldEstimatedValue(
  purchases: GoldPurchase[],
  prices: AssetSettings["goldReferencePricePerChi"],
): number {
  const qty = goldQtyByType(purchases);
  return (
    Math.round(phanToChi(qty["9999"]) * prices["9999"]) +
    Math.round(phanToChi(qty["18k"]) * prices["18k"]) +
    Math.round(phanToChi(qty.other) * prices.other)
  );
}

function lentCapital(loans: Loan[], transactions: Transaction[]): number {
  const txsByLoan = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = txsByLoan.get(tx.loanId) ?? [];
    list.push(tx);
    txsByLoan.set(tx.loanId, list);
  }
  return loans
    .filter((l) => l.status === "ACTIVE")
    .reduce(
      (sum, loan) =>
        sum +
        getRemainingPrincipal(
          loan.principalAmount,
          txsByLoan.get(loan.id) ?? [],
        ),
      0,
    );
}

export const assetRepository = {
  async listManual(): Promise<ManualAsset[]> {
    const rows = await getDb().manualAssets.toArray();
    return rows.filter(isActiveRecord).map((r) => strip(r) as ManualAsset);
  },

  async createManual(
    body: Omit<ManualAsset, "id" | "createdAt" | "updatedAt">,
  ): Promise<ManualAsset> {
    const now = nowIso();
    const row: LocalManualAsset = {
      ...body,
      id: newId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await getDb().manualAssets.put(row);
    await enqueueAndKick({
      entity: "manualAsset",
      entityId: row.id,
      action: "create",
      payload: { ...row },
    });
    return strip(row) as ManualAsset;
  },

  async updateManual(
    id: string,
    values: Omit<ManualAsset, "id" | "createdAt" | "updatedAt">,
  ): Promise<ManualAsset> {
    const existing = await getDb().manualAssets.get(id);
    if (!existing || !isActiveRecord(existing)) {
      throw new Error("Không tìm thấy tài sản");
    }
    const row: LocalManualAsset = {
      ...existing,
      ...values,
      id,
      updatedAt: nowIso(),
    };
    await getDb().manualAssets.put(row);
    await enqueueAndKick({
      entity: "manualAsset",
      entityId: id,
      action: "update",
      payload: { ...row },
    });
    return strip(row) as ManualAsset;
  },

  async removeManual(id: string): Promise<void> {
    const existing = await getDb().manualAssets.get(id);
    if (!existing) return;
    await getDb().manualAssets.put({
      ...existing,
      deletedAt: nowIso(),
      updatedAt: nowIso(),
    });
    await enqueueAndKick({
      entity: "manualAsset",
      entityId: id,
      action: "delete",
      payload: { id },
    });
  },

  async listGoldPurchases(): Promise<GoldPurchase[]> {
    const rows = await getDb().goldPurchases.toArray();
    return rows
      .filter(isActiveRecord)
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
      .map((r) => strip(r) as GoldPurchase);
  },

  async createGoldPurchase(
    body: Omit<GoldPurchase, "id" | "createdAt" | "updatedAt">,
  ): Promise<GoldPurchase> {
    const now = nowIso();
    const row: LocalGoldPurchase = {
      ...body,
      id: newId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await getDb().goldPurchases.put(row);
    await enqueueAndKick({
      entity: "goldPurchase",
      entityId: row.id,
      action: "create",
      payload: { ...row },
    });
    return strip(row) as GoldPurchase;
  },

  async updateGoldPurchase(
    id: string,
    values: Omit<GoldPurchase, "id" | "createdAt" | "updatedAt">,
  ): Promise<GoldPurchase> {
    const existing = await getDb().goldPurchases.get(id);
    if (!existing || !isActiveRecord(existing)) {
      throw new Error("Không tìm thấy giao dịch vàng");
    }
    const row: LocalGoldPurchase = {
      ...existing,
      ...values,
      id,
      updatedAt: nowIso(),
    };
    await getDb().goldPurchases.put(row);
    await enqueueAndKick({
      entity: "goldPurchase",
      entityId: id,
      action: "update",
      payload: { ...row },
    });
    return strip(row) as GoldPurchase;
  },

  async removeGoldPurchase(id: string): Promise<void> {
    const existing = await getDb().goldPurchases.get(id);
    if (!existing) return;
    await getDb().goldPurchases.put({
      ...existing,
      deletedAt: nowIso(),
      updatedAt: nowIso(),
    });
    await enqueueAndKick({
      entity: "goldPurchase",
      entityId: id,
      action: "delete",
      payload: { id },
    });
  },

  async getGoldPlan(): Promise<GoldPlan | null> {
    const row = await getDb().goldPlans.get(PLAN_ID);
    if (!row || !isActiveRecord(row)) return null;
    return strip(row) as GoldPlan;
  },

  async upsertGoldPlan(
    body: Omit<GoldPlan, "id" | "createdAt" | "updatedAt"> & {
      budgetEffectiveFrom?: string;
    },
  ): Promise<GoldPlan> {
    const existing = await getDb().goldPlans.get(PLAN_ID);
    const now = nowIso();
    const { budgetEffectiveFrom: _b, ...rest } = body;
    void _b;
    const row: LocalGoldPlan = {
      ...(existing ?? {
        id: PLAN_ID,
        createdAt: now,
      }),
      ...rest,
      id: PLAN_ID,
      updatedAt: now,
      deletedAt: null,
      createdAt: existing?.createdAt ?? now,
    };
    await getDb().goldPlans.put(row);
    await enqueueAndKick({
      entity: "goldPlan",
      entityId: PLAN_ID,
      action: "update",
      payload: { ...body },
    });
    return strip(row) as GoldPlan;
  },

  async getSettings(): Promise<AssetSettings> {
    const row = await getDb().assetSettings.get(SETTINGS_ID);
    if (row) return strip(row) as AssetSettings;
    const now = nowIso();
    const defaults: LocalAssetSettings = {
      id: SETTINGS_ID,
      goldReferencePricePerChi: { "9999": 0, "18k": 0, other: 0 },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    return strip(defaults) as AssetSettings;
  },

  async updateSettings(body: {
    goldReferencePricePerChi?: Partial<
      AssetSettings["goldReferencePricePerChi"]
    >;
    allocationTargets?: AssetSettings["allocationTargets"] | null;
  }): Promise<AssetSettings> {
    const existing = await this.getSettings();
    const now = nowIso();
    const row: LocalAssetSettings = {
      ...existing,
      goldReferencePricePerChi: {
        ...existing.goldReferencePricePerChi,
        ...body.goldReferencePricePerChi,
      },
      allocationTargets:
        body.allocationTargets === undefined
          ? existing.allocationTargets
          : (body.allocationTargets ?? undefined),
      updatedAt: now,
      deletedAt: null,
    };
    await getDb().assetSettings.put(row);
    await enqueueAndKick({
      entity: "assetSettings",
      entityId: SETTINGS_ID,
      action: "update",
      payload: { ...body },
    });
    return strip(row) as AssetSettings;
  },

  async getSummary(): Promise<AssetSummary> {
    const [assets, purchases, settings, plan, loans, transactions] =
      await Promise.all([
        this.listManual(),
        this.listGoldPurchases(),
        this.getSettings(),
        this.getGoldPlan(),
        getDb().loans.toArray(),
        getDb().loanTransactions.toArray(),
      ]);

    const activeLoans = loans
      .filter(isActiveRecord)
      .map((r) => strip(r) as Loan);
    const activeTx = transactions
      .filter(isActiveRecord)
      .map((r) => strip(r) as Transaction);

    const lent = lentCapital(activeLoans, activeTx);
    const availableCash = calculateAvailableCash(assets);
    const otherAssets = calculateOtherAssets(assets);
    const manualGold = calculateManualGoldAssets(assets);
    const goldValue =
      goldEstimatedValue(purchases, settings.goldReferencePricePerChi) +
      manualGold;
    const goldCost = calculateGoldCost(purchases);
    const quantityByType = goldQtyByType(purchases);
    const totalGoldPhan =
      quantityByType["9999"] +
      quantityByType["18k"] +
      quantityByType.other;
    const totalAssets =
      lent + availableCash + otherAssets + goldValue;
    const allocation = buildAllocation({
      lentCapital: lent,
      availableCash,
      otherAssets,
      goldValue,
      targets: settings.allocationTargets,
    });

    return {
      totalAssets,
      lentCapital: lent,
      availableCash,
      otherAssets,
      goldValue,
      goldCost,
      goldDifference: goldValue - goldCost - manualGold,
      totalGoldPhan,
      totalGoldChi: phanToChi(totalGoldPhan),
      quantityByType,
      allocation,
      settings,
      plan,
      purchasesCount: purchases.length,
    };
  },

  async getAllocation(): Promise<AssetAllocation> {
    const summary = await this.getSummary();
    return summary.allocation;
  },
};

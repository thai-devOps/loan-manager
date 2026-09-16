import { getDb } from "@/db/database";
import {
  enqueueAndKick,
  isActiveRecord,
  newId,
  nowIso,
} from "@/db/repositories/baseRepository";
import type { LocalFinanceTransaction } from "@/db/schema";
import type { FinanceTransaction } from "@/types/finance";

function toRow(row: LocalFinanceTransaction): FinanceTransaction {
  const { deletedAt: _d, ...rest } = row;
  void _d;
  return rest;
}

export const financeRepository = {
  async list(params?: {
    month?: string;
    from?: string;
    to?: string;
  }): Promise<FinanceTransaction[]> {
    const db = getDb();
    let rows: LocalFinanceTransaction[];

    if (params?.month && /^\d{4}-\d{2}$/.test(params.month)) {
      const from = `${params.month}-01`;
      const to = `${params.month}-31`;
      rows = await db.financeTransactions
        .where("date")
        .between(from, to, true, true)
        .toArray();
    } else if (params?.from && params?.to) {
      rows = await db.financeTransactions
        .where("date")
        .between(params.from, params.to, true, true)
        .toArray();
    } else if (params?.from) {
      rows = await db.financeTransactions
        .where("date")
        .aboveOrEqual(params.from)
        .toArray();
    } else {
      rows = await db.financeTransactions.toArray();
    }

    return rows
      .filter(isActiveRecord)
      .sort((a, b) => {
        const d = b.date.localeCompare(a.date);
        return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt);
      })
      .map(toRow);
  },

  async create(
    body: Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<FinanceTransaction> {
    const now = nowIso();
    const row: LocalFinanceTransaction = {
      ...body,
      id: newId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await getDb().financeTransactions.put(row);
    await enqueueAndKick({
      entity: "financeTransaction",
      entityId: row.id,
      action: "create",
      payload: { ...row },
    });
    return toRow(row);
  },

  async update(
    id: string,
    values: Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<FinanceTransaction> {
    const existing = await getDb().financeTransactions.get(id);
    if (!existing || !isActiveRecord(existing)) {
      throw new Error("Không tìm thấy giao dịch");
    }
    const row: LocalFinanceTransaction = {
      ...existing,
      ...values,
      id,
      updatedAt: nowIso(),
    };
    await getDb().financeTransactions.put(row);
    await enqueueAndKick({
      entity: "financeTransaction",
      entityId: id,
      action: "update",
      payload: { ...row },
    });
    return toRow(row);
  },

  async remove(id: string): Promise<void> {
    const existing = await getDb().financeTransactions.get(id);
    if (!existing) return;
    await getDb().financeTransactions.put({
      ...existing,
      deletedAt: nowIso(),
      updatedAt: nowIso(),
    });
    await enqueueAndKick({
      entity: "financeTransaction",
      entityId: id,
      action: "delete",
      payload: { id },
    });
  },
};

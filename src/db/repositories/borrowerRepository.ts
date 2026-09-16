import { getDb } from "@/db/database";
import {
  enqueueAndKick,
  isActiveRecord,
  newId,
  nowIso,
} from "@/db/repositories/baseRepository";
import type { LocalBorrower } from "@/db/schema";
import type { BorrowerFormValues } from "@/schemas/borrower.schema";
import type { Borrower } from "@/types/borrower";

function toBorrower(row: LocalBorrower): Borrower {
  const { deletedAt: _d, ...rest } = row;
  void _d;
  return rest;
}

export const borrowerRepository = {
  async list(): Promise<Borrower[]> {
    const rows = await getDb().borrowers.toArray();
    return rows.filter(isActiveRecord).map(toBorrower);
  },

  async get(id: string): Promise<Borrower | undefined> {
    const row = await getDb().borrowers.get(id);
    if (!row || !isActiveRecord(row)) return undefined;
    return toBorrower(row);
  },

  async create(values: BorrowerFormValues): Promise<Borrower> {
    const now = nowIso();
    const row: LocalBorrower = {
      id: newId(),
      name: values.name.trim(),
      phone: values.phone?.trim() || undefined,
      identityNumber: values.identityNumber?.trim() || undefined,
      address: values.address?.trim() || undefined,
      note: values.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await getDb().borrowers.put(row);
    await enqueueAndKick({
      entity: "borrower",
      entityId: row.id,
      action: "create",
      payload: { ...row },
    });
    return toBorrower(row);
  },

  async update(id: string, values: BorrowerFormValues): Promise<Borrower> {
    const existing = await getDb().borrowers.get(id);
    if (!existing || !isActiveRecord(existing)) {
      throw new Error("Không tìm thấy người vay");
    }
    const row: LocalBorrower = {
      ...existing,
      name: values.name.trim(),
      phone: values.phone?.trim() || undefined,
      identityNumber: values.identityNumber?.trim() || undefined,
      address: values.address?.trim() || undefined,
      note: values.note?.trim() || undefined,
      updatedAt: nowIso(),
    };
    await getDb().borrowers.put(row);
    await enqueueAndKick({
      entity: "borrower",
      entityId: id,
      action: "update",
      payload: { ...row },
    });
    return toBorrower(row);
  },
};

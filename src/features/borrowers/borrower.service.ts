import { db } from "@/db/database";
import { toISOString } from "@/lib/date";
import type { BorrowerFormValues } from "@/schemas/borrower.schema";
import type { Borrower } from "@/types/borrower";

export async function createBorrower(
  values: BorrowerFormValues,
): Promise<Borrower> {
  const now = toISOString();
  const borrower: Borrower = {
    id: crypto.randomUUID(),
    name: values.name.trim(),
    phone: values.phone?.trim() || undefined,
    identityNumber: values.identityNumber?.trim() || undefined,
    address: values.address?.trim() || undefined,
    note: values.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await db.borrowers.add(borrower);
  return borrower;
}

export async function updateBorrower(
  id: string,
  values: BorrowerFormValues,
): Promise<void> {
  await db.borrowers.update(id, {
    name: values.name.trim(),
    phone: values.phone?.trim() || undefined,
    identityNumber: values.identityNumber?.trim() || undefined,
    address: values.address?.trim() || undefined,
    note: values.note?.trim() || undefined,
    updatedAt: toISOString(),
  });
}

export async function getBorrowerById(id: string): Promise<Borrower | undefined> {
  return db.borrowers.get(id);
}

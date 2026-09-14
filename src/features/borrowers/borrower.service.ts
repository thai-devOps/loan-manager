import { createBorrower as apiCreate, updateBorrower as apiUpdate } from "@/api/endpoints";
import type { BorrowerFormValues } from "@/schemas/borrower.schema";
import type { Borrower } from "@/types/borrower";

export async function createBorrower(
  values: BorrowerFormValues,
): Promise<Borrower> {
  return apiCreate(values);
}

export async function updateBorrower(
  id: string,
  values: BorrowerFormValues,
): Promise<void> {
  await apiUpdate(id, values);
}

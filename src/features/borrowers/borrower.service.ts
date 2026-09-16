import { borrowerRepository } from "@/db/repositories/borrowerRepository";
import type { BorrowerFormValues } from "@/schemas/borrower.schema";
import type { Borrower } from "@/types/borrower";

export async function createBorrower(
  values: BorrowerFormValues,
): Promise<Borrower> {
  return borrowerRepository.create(values);
}

export async function updateBorrower(
  id: string,
  values: BorrowerFormValues,
): Promise<Borrower> {
  return borrowerRepository.update(id, values);
}

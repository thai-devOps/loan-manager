import { useOutletContext } from "react-router-dom";
import type { FinanceTransaction } from "@/types/finance";

export type FinanceOutletContext = {
  month: string;
  openCreate: (type?: "income" | "expense") => void;
  openEdit: (tx: FinanceTransaction) => void;
};

export function useFinanceOutlet() {
  return useOutletContext<FinanceOutletContext>();
}

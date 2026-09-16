import { createContext, useContext } from "react";
import type { DateRangePreset } from "@/features/finance/lib/date-range";

export type FinanceMonthContextValue = {
  preset: DateRangePreset;
  from: string;
  to: string;
  /** Calendar month of range end — used for chart anchoring. */
  month: string;
  setPreset: (preset: DateRangePreset) => void;
  setCustomRange: (from: string, to: string) => void;
  openCreate: (type?: "income" | "expense") => void;
};

export const FinanceMonthContext =
  createContext<FinanceMonthContextValue | null>(null);

export function useFinanceMonth() {
  const ctx = useContext(FinanceMonthContext);
  if (!ctx) {
    throw new Error("useFinanceMonth must be used within FinanceLayout");
  }
  return ctx;
}

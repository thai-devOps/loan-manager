import { createContext, useContext } from "react";

export type FinanceMonthContextValue = {
  month: string;
  setMonth: (month: string) => void;
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

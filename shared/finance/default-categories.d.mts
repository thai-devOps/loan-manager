export type SeedFinanceCategory = {
  key: string;
  name: string;
  description: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  sortOrder: number;
};

export const DEFAULT_FINANCE_CATEGORIES: SeedFinanceCategory[];

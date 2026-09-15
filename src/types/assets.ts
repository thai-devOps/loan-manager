export type ManualAssetType = "cash" | "bank" | "wallet" | "gold" | "other";

export type GoldType = "9999" | "18k" | "other";

export interface ManualAssetGoldDetails {
  goldType: GoldType;
  quantityInPhan: number;
  purchasePricePerChi: number;
  totalCost: number;
  seller?: string;
}

export interface ManualAsset {
  id: string;
  name: string;
  type: ManualAssetType;
  value: number;
  valuationDate: string;
  note?: string;
  goldDetails?: ManualAssetGoldDetails;
  createdAt: string;
  updatedAt: string;
}

export interface GoldPurchase {
  id: string;
  type: GoldType;
  quantityInPhan: number;
  purchasePricePerChi: number;
  totalCost: number;
  purchaseDate: string;
  seller?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoldPlanStatus =
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "expired";

export interface GoldPlanBudgetEntry {
  /** YYYY-MM — budget applies from this month inclusive */
  effectiveFrom: string;
  monthlyBudget: number;
}

export interface GoldPlan {
  id: string;
  /** Legacy / reference money goal — kept for backward compatibility */
  targetAmount: number;
  /** Primary goal in integer phân; null/undefined = legacy plan not yet migrated */
  targetQuantityInPhan?: number | null;
  /** Loại vàng kế hoạch mua (9999 / 18k / other) */
  goldType?: GoldType | null;
  initialQuantityInPhan: number;
  includeInitialQuantity: boolean;
  monthlyBudget: number;
  budgetHistory: GoldPlanBudgetEntry[];
  plannedPurchaseDay: number;
  startMonth: string;
  endMonth: string;
  status: GoldPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AssetSettings {
  id: string;
  goldReferencePricePerChi: {
    "9999": number;
    "18k": number;
    other: number;
  };
  allocationTargets?: {
    lending: number;
    reserve: number;
    gold: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AssetSnapshot {
  id: string;
  month: string;
  totalAssets: number;
  lentCapital: number;
  availableCash: number;
  otherAssets: number;
  goldValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationSegment {
  key: "lending" | "reserve" | "other" | "gold";
  label: string;
  amount: number;
  percent: number;
}

export interface AssetAllocation {
  totalAssets: number;
  lentCapital: number;
  availableCash: number;
  otherAssets: number;
  goldValue: number;
  segments: AllocationSegment[];
  targets?: {
    lending: number;
    reserve: number;
    gold: number;
  } | null;
}

export interface AssetSummary {
  totalAssets: number;
  lentCapital: number;
  availableCash: number;
  otherAssets: number;
  goldValue: number;
  goldCost: number;
  goldDifference: number;
  totalGoldPhan: number;
  totalGoldChi: number;
  quantityByType: Record<GoldType, number>;
  allocation: AssetAllocation;
  settings: AssetSettings;
  plan: GoldPlan | null;
  purchasesCount: number;
}

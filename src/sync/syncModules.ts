import type { SyncEntity } from "@/db/schema";

/** Modules that own IndexedDB pull entities (not fleet/access/report UI). */
export type SyncDataModule = "loan" | "finance" | "asset" | "gold";

export const SYNC_DATA_MODULES: SyncDataModule[] = [
  "loan",
  "finance",
  "asset",
  "gold",
];

/** Entities fetched when a data module is synced. */
export const MODULE_PULL_ENTITIES: Record<SyncDataModule, SyncEntity[]> = {
  loan: ["borrower", "loan", "loanTransaction", "interestSchedule"],
  finance: ["financeTransaction"],
  asset: ["manualAsset", "assetSettings"],
  gold: ["goldPurchase", "goldPlan", "assetSettings"],
};

export function moduleMetaKey(module: SyncDataModule): string {
  return `moduleSync:${module}`;
}

export function entitiesForModules(modules: readonly SyncDataModule[]): SyncEntity[] {
  const set = new Set<SyncEntity>();
  for (const mod of modules) {
    for (const entity of MODULE_PULL_ENTITIES[mod]) {
      set.add(entity);
    }
  }
  return [...set];
}

export function moduleForEntity(entity: SyncEntity): SyncDataModule | null {
  switch (entity) {
    case "borrower":
    case "loan":
    case "loanTransaction":
    case "interestSchedule":
    case "loanPayment":
      return "loan";
    case "financeTransaction":
      return "finance";
    case "manualAsset":
    case "assetSettings":
      return "asset";
    case "goldPurchase":
    case "goldPlan":
      return "gold";
    default:
      return null;
  }
}

export function isSyncDataModule(value: string): value is SyncDataModule {
  return (SYNC_DATA_MODULES as string[]).includes(value);
}

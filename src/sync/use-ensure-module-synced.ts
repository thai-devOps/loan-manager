import { useEffect } from "react";
import { ensureModuleSynced } from "@/sync/syncManager";
import type { SyncDataModule } from "@/sync/syncModules";

/** Kick lazy IndexedDB pull when the user enters a data module. */
export function useEnsureModuleSynced(
  modules: SyncDataModule | SyncDataModule[],
): void {
  const key = Array.isArray(modules) ? modules.join(",") : modules;

  useEffect(() => {
    const list = (
      Array.isArray(modules) ? modules : [modules]
    ) as SyncDataModule[];
    void ensureModuleSynced(list);
    // key captures the module list identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

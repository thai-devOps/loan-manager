import { useLiveQuery } from "dexie-react-hooks";
import { isDbOpen } from "@/db/database";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useSyncStore } from "@/stores/sync.store";
import { syncQueueRepository } from "@/features/sync/sync-queue.repository";

export function useSyncQueue() {
  const dbReady = useSyncStore((s) => s.dbReady);
  const status = useSyncStatus();

  const ops = useLiveQuery(
    async () => {
      if (!dbReady || !isDbOpen()) return [];
      return syncQueueRepository.listActive();
    },
    [dbReady],
    [],
  );

  const conflicts = useLiveQuery(
    async () => {
      if (!dbReady || !isDbOpen()) return [];
      return syncQueueRepository.listConflicts();
    },
    [dbReady],
    [],
  );

  return {
    ...status,
    ops: ops ?? [],
    conflicts: conflicts ?? [],
    failedCount: (ops ?? []).filter((o) => o.status === "failed").length,
    conflictQueueCount: (ops ?? []).filter((o) => o.status === "conflict")
      .length,
  };
}

import { useSyncStore } from "@/stores/sync.store";

export function useSyncStatus() {
  const isOnline = useSyncStore((s) => s.isOnline);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const hasSyncError = useSyncStore((s) => s.hasSyncError);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    hasSyncError,
  };
}

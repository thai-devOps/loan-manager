import { getDb, isDbOpen } from "@/db/database";
import { SYNC_META_KEYS } from "@/db/schema";
import { emitSyncEvent } from "@/sync/syncEvents";
import { countPendingOps } from "@/sync/syncQueue";
import { syncPull } from "@/sync/syncPull";
import { syncPush } from "@/sync/syncPush";
import { restReplayTransport } from "@/sync/transports/restReplayTransport";
import type { SyncTransport } from "@/sync/transports/types";
import { useSyncStore } from "@/stores/sync.store";
import { queryClient } from "@/lib/query-client";

const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000] as const;

let transport: SyncTransport = restReplayTransport;
let syncing = false;
let started = false;
let backoffIndex = 0;
let backoffTimer: ReturnType<typeof setTimeout> | null = null;
let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;

export function setSyncTransport(next: SyncTransport): void {
  transport = next;
}

async function refreshStatus(partial?: {
  isSyncing?: boolean;
  hasSyncError?: boolean;
}): Promise<void> {
  if (!isDbOpen()) {
    useSyncStore.getState().setStatus({
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      isSyncing: false,
      pendingCount: 0,
      lastSyncAt: null,
      hasSyncError: false,
    });
    return;
  }
  const pendingCount = await countPendingOps();
  const lastSyncAt =
    (await getDb().syncMetadata.get(SYNC_META_KEYS.lastSyncAt))?.value ?? null;
  useSyncStore.getState().setStatus({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: partial?.isSyncing ?? syncing,
    pendingCount,
    lastSyncAt,
    hasSyncError: partial?.hasSyncError ?? useSyncStore.getState().hasSyncError,
  });
  emitSyncEvent("status");
}

function scheduleBackoffRetry(): void {
  if (backoffTimer) return;
  const delay = BACKOFF_MS[Math.min(backoffIndex, BACKOFF_MS.length - 1)];
  backoffIndex += 1;
  backoffTimer = setTimeout(() => {
    backoffTimer = null;
    void runSync();
  }, delay);
}

export function requestSync(): void {
  if (typeof window === "undefined") return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    void refreshStatus({ isSyncing: false });
    return;
  }
  void runSync();
}

export async function runSync(options?: {
  pullOnly?: boolean;
  pushOnly?: boolean;
}): Promise<void> {
  if (!isDbOpen()) return;
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await refreshStatus({ isSyncing: false });
    return;
  }

  syncing = true;
  await refreshStatus({ isSyncing: true, hasSyncError: false });

  try {
    if (!options?.pullOnly) {
      const { failed } = await syncPush(transport);
      if (failed > 0) {
        useSyncStore.getState().setStatus({ hasSyncError: true });
        scheduleBackoffRetry();
      } else {
        backoffIndex = 0;
      }
    }
    if (!options?.pushOnly) {
      await syncPull(transport);
    }
    emitSyncEvent("synced");
    await queryClient.invalidateQueries();
    await refreshStatus({ isSyncing: false, hasSyncError: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed";
    emitSyncEvent("error", { message });
    await refreshStatus({ isSyncing: false, hasSyncError: true });
    scheduleBackoffRetry();
  } finally {
    syncing = false;
    await refreshStatus({ isSyncing: false });
  }
}

export async function ensureInitialSync(): Promise<void> {
  if (!isDbOpen()) return;
  const done = await getDb().syncMetadata.get(SYNC_META_KEYS.initialSyncDone);
  if (done?.value === "1") {
    requestSync();
    return;
  }
  await runSync();
}

export function startSyncManager(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  onlineHandler = () => {
    backoffIndex = 0;
    void refreshStatus();
    requestSync();
  };
  offlineHandler = () => {
    void refreshStatus({ isSyncing: false });
  };

  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);
  void refreshStatus();
}

export function stopSyncManager(): void {
  if (!started || typeof window === "undefined") return;
  started = false;
  if (onlineHandler) window.removeEventListener("online", onlineHandler);
  if (offlineHandler) window.removeEventListener("offline", offlineHandler);
  onlineHandler = null;
  offlineHandler = null;
  if (backoffTimer) {
    clearTimeout(backoffTimer);
    backoffTimer = null;
  }
}

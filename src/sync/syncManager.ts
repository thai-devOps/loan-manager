import { ApiError } from "@/api/client";
import { getDb, isDbOpen } from "@/db/database";
import { SYNC_META_KEYS } from "@/db/schema";
import { emitSyncEvent } from "@/sync/syncEvents";
import {
  countPendingOps,
  listPendingOps,
  reclaimSyncingOps,
} from "@/sync/syncQueue";
import {
  isSyncDataModule,
  moduleForEntity,
  moduleMetaKey,
  SYNC_DATA_MODULES,
  type SyncDataModule,
} from "@/sync/syncModules";
import { syncPull } from "@/sync/syncPull";
import { syncPush } from "@/sync/syncPush";
import { restReplayTransport } from "@/sync/transports/restReplayTransport";
import type { SyncTransport } from "@/sync/transports/types";
import { useSyncStore } from "@/stores/sync.store";
import { queryClient } from "@/lib/query-client";

const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000] as const;

function isTransientSyncFailure(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return false;
    if (error.status >= 400 && error.status < 500 && error.status !== 408) {
      return false;
    }
    return error.status === 0 || error.status >= 500 || error.status === 408;
  }
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("offline") ||
      msg.includes("failed to fetch")
    );
  }
  return true;
}

let transport: SyncTransport = restReplayTransport;
let syncing = false;
let started = false;
let backoffIndex = 0;
let backoffTimer: ReturnType<typeof setTimeout> | null = null;
let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;
let initialSyncInFlight: Promise<void> | null = null;
const moduleSyncInFlight = new Map<string, Promise<void>>();

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

async function isInitialSyncDone(): Promise<boolean> {
  if (!isDbOpen()) return false;
  const done = await getDb().syncMetadata.get(SYNC_META_KEYS.initialSyncDone);
  return done?.value === "1";
}

async function markGateReady(): Promise<void> {
  useSyncStore.getState().setStatus({
    initialSyncReady: true,
    initialSyncPhase: "ready",
    initialSyncError: null,
  });
}

async function markInitialReadyIfDone(): Promise<boolean> {
  if (!(await isInitialSyncDone())) return false;
  await markGateReady();
  return true;
}

async function markDbReadyWithoutFullPull(): Promise<void> {
  await getDb().syncMetadata.put({
    key: SYNC_META_KEYS.initialSyncDone,
    value: "1",
  });
  await markGateReady();
}

function markInitialSyncError(message: string): void {
  useSyncStore.getState().setStatus({
    initialSyncReady: false,
    initialSyncPhase: "error",
    initialSyncError: message,
    isSyncing: false,
  });
}

function clearBackoff(): void {
  if (backoffTimer) {
    clearTimeout(backoffTimer);
    backoffTimer = null;
  }
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

async function readHasModuleAccess(module: string): Promise<boolean> {
  const { useAuthStore } = await import("@/stores/auth.store");
  return useAuthStore.getState().hasModuleAccess(module);
}

async function filterAccessible(
  modules: SyncDataModule[],
): Promise<SyncDataModule[]> {
  const out: SyncDataModule[] = [];
  for (const mod of modules) {
    if (await readHasModuleAccess(mod)) out.push(mod);
  }
  return out;
}

async function readActivatedModules(): Promise<SyncDataModule[]> {
  if (!isDbOpen()) return [];
  const row = await getDb().syncMetadata.get(SYNC_META_KEYS.activatedModules);
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is SyncDataModule => typeof m === "string" && isSyncDataModule(m),
    );
  } catch {
    return [];
  }
}

async function writeActivatedModules(modules: SyncDataModule[]): Promise<void> {
  const unique = [...new Set(modules)];
  await getDb().syncMetadata.put({
    key: SYNC_META_KEYS.activatedModules,
    value: JSON.stringify(unique),
  });
}

async function activateModules(modules: SyncDataModule[]): Promise<SyncDataModule[]> {
  const current = await readActivatedModules();
  const next = [...new Set([...current, ...modules])];
  await writeActivatedModules(next);
  return next;
}

async function modulesFromPendingQueue(): Promise<SyncDataModule[]> {
  const pending = await listPendingOps();
  const mods = new Set<SyncDataModule>();
  for (const item of pending) {
    const mod = moduleForEntity(item.entity);
    if (mod) mods.add(mod);
  }
  return [...mods];
}

async function resolvePullModules(
  scope: "activated" | "allAccessible" | SyncDataModule[],
): Promise<SyncDataModule[]> {
  if (Array.isArray(scope)) {
    return filterAccessible(scope);
  }
  if (scope === "allAccessible") {
    return filterAccessible([...SYNC_DATA_MODULES]);
  }
  const activated = await readActivatedModules();
  const fromQueue = await modulesFromPendingQueue();
  return filterAccessible([...new Set([...activated, ...fromQueue])]);
}

export function requestSync(): void {
  if (typeof window === "undefined") return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    void refreshStatus({ isSyncing: false });
    return;
  }
  void runSync({ pullScope: "activated" });
}

export async function runSync(options?: {
  pullOnly?: boolean;
  pushOnly?: boolean;
  /** Which modules to pull. Default: activated + pending-queue modules. */
  pullScope?: "activated" | "allAccessible" | SyncDataModule[];
}): Promise<void> {
  if (!isDbOpen()) return;
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await reclaimSyncingOps();
    await refreshStatus({ isSyncing: false });
    return;
  }

  syncing = true;
  await refreshStatus({ isSyncing: true });

  let hardFailed = 0;
  let deferred = 0;
  let pushClean = true;

  try {
    if (!options?.pullOnly) {
      const result = await syncPush(transport);
      hardFailed = result.failed;
      deferred = result.deferred;
      pushClean = hardFailed === 0 && deferred === 0;

      if (hardFailed > 0) {
        useSyncStore.getState().setStatus({ hasSyncError: true });
        scheduleBackoffRetry();
      } else if (deferred > 0) {
        useSyncStore.getState().setStatus({ hasSyncError: false });
        scheduleBackoffRetry();
      } else {
        backoffIndex = 0;
      }
    }

    const pullScope = options?.pullScope ?? "activated";
    const modules = options?.pushOnly
      ? []
      : await resolvePullModules(pullScope);
    const shouldPull = !options?.pushOnly && pushClean && modules.length > 0;

    if (shouldPull) {
      await syncPull(transport, {
        modules,
        markModules: modules,
      });
      emitSyncEvent("synced");
      void queryClient.invalidateQueries({ refetchType: "active" });
      await refreshStatus({ isSyncing: false, hasSyncError: false });
      await markInitialReadyIfDone();
    } else {
      if (!options?.pullOnly && pushClean) {
        await getDb().syncMetadata.put({
          key: SYNC_META_KEYS.initialSyncDone,
          value: "1",
        });
        await markGateReady();
      }
      void queryClient.invalidateQueries({ refetchType: "active" });
      await refreshStatus({
        isSyncing: false,
        hasSyncError: hardFailed > 0,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed";
    emitSyncEvent("error", { message });
    await reclaimSyncingOps();
    await refreshStatus({ isSyncing: false, hasSyncError: true });
    if (isTransientSyncFailure(error)) {
      scheduleBackoffRetry();
    } else {
      clearBackoff();
      backoffIndex = 0;
    }
  } finally {
    syncing = false;
    await refreshStatus({ isSyncing: false });
  }
}

/**
 * Lazy-pull IndexedDB data for one or more modules the first time the user opens them.
 */
export async function ensureModuleSynced(
  modules: SyncDataModule | SyncDataModule[],
): Promise<void> {
  if (!isDbOpen()) return;
  const list = (Array.isArray(modules) ? modules : [modules]).filter(
    isSyncDataModule,
  );
  if (list.length === 0) return;

  const accessible = await filterAccessible(list);
  if (accessible.length === 0) return;

  const key = accessible.slice().sort().join(",");
  const existing = moduleSyncInFlight.get(key);
  if (existing) return existing;

  const work = (async () => {
    await activateModules(accessible);

    const needsPull: SyncDataModule[] = [];
    for (const mod of accessible) {
      const done = await getDb().syncMetadata.get(moduleMetaKey(mod));
      if (done?.value !== "1") needsPull.push(mod);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    if (needsPull.length > 0) {
      await runSync({ pullScope: needsPull });
      return;
    }

    // Already synced once — background refresh for activated modules only
    requestSync();
  })().finally(() => {
    moduleSyncInFlight.delete(key);
  });

  moduleSyncInFlight.set(key, work);
  return work;
}

async function runEnsureInitialSync(): Promise<void> {
  clearBackoff();
  backoffIndex = 0;

  if (!isDbOpen()) {
    markInitialSyncError("Cơ sở dữ liệu cục bộ chưa sẵn sàng");
    return;
  }

  useSyncStore.getState().setStatus({
    initialSyncPhase: "checking",
    initialSyncError: null,
  });

  // Returning users: open gate immediately; do NOT full-pull every module.
  if (await isInitialSyncDone()) {
    await markGateReady();
    const pending = await countPendingOps();
    if (pending > 0) {
      requestSync();
    }
    return;
  }

  useSyncStore.getState().setStatus({
    initialSyncReady: false,
    initialSyncPhase: "syncing",
    initialSyncError: null,
  });

  // First visit: push any pending ops if online, then open gate without fan-out pull.
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      await runSync({ pushOnly: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đồng bộ thất bại";
      markInitialSyncError(message);
      return;
    }
  }

  await markDbReadyWithoutFullPull();
  await refreshStatus({ isSyncing: false });
}

export async function ensureInitialSync(): Promise<void> {
  if (initialSyncInFlight !== null) return initialSyncInFlight;
  initialSyncInFlight = runEnsureInitialSync().finally(() => {
    initialSyncInFlight = null;
  });
  return initialSyncInFlight;
}

/** Retry first-time sync from the gate UI (or online event). */
export async function retryInitialSync(): Promise<void> {
  const { initialSyncReady } = useSyncStore.getState();
  if (initialSyncReady) return;
  await ensureInitialSync();
}

export function startSyncManager(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  onlineHandler = () => {
    backoffIndex = 0;
    void (async () => {
      if (isDbOpen()) await reclaimSyncingOps();
      await refreshStatus();
      const { initialSyncReady, initialSyncPhase } = useSyncStore.getState();
      if (!initialSyncReady && initialSyncPhase === "error") {
        await retryInitialSync();
        return;
      }
      requestSync();
    })();
  };
  offlineHandler = () => {
    clearBackoff();
    void (async () => {
      if (isDbOpen()) await reclaimSyncingOps();
      await refreshStatus({ isSyncing: false });
    })();
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
  clearBackoff();
  initialSyncInFlight = null;
  moduleSyncInFlight.clear();
}

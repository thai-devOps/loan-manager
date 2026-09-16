import { create } from "zustand";

export type InitialSyncPhase = "checking" | "syncing" | "ready" | "error";

export interface SyncStatusState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  hasSyncError: boolean;
  /** True when per-user Dexie DB is open for the authenticated session. */
  dbReady: boolean;
  /** True once initialSyncDone meta is confirmed for this session. */
  initialSyncReady: boolean;
  initialSyncPhase: InitialSyncPhase;
  initialSyncError: string | null;
  setStatus: (
    partial: Partial<Omit<SyncStatusState, "setStatus" | "reset">>,
  ) => void;
  reset: () => void;
}

const initial = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null as string | null,
  hasSyncError: false,
  dbReady: false,
  initialSyncReady: false,
  initialSyncPhase: "checking" as InitialSyncPhase,
  initialSyncError: null as string | null,
};

export const useSyncStore = create<SyncStatusState>((set) => ({
  ...initial,
  setStatus: (partial) => set((state) => ({ ...state, ...partial })),
  reset: () =>
    set({
      ...initial,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    }),
}));

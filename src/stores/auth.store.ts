import { create } from "zustand";
import {
  clearSession,
  getSession,
  loginRequest,
  logout as clearAuth,
  touchSession,
  type AuthSession,
} from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { closeUserDatabase, openUserDatabase } from "@/db/database";
import {
  ensureInitialSync,
  startSyncManager,
  stopSyncManager,
} from "@/sync/syncManager";
import { useSyncStore } from "@/stores/sync.store";

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  hydrate: () => void;
  login: (
    username: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => void;
  touch: () => void;
  /** Open IndexedDB for session user and kick background sync (non-blocking). */
  prepareLocalDb: () => Promise<void>;
}

function syncFromStorage(): Pick<AuthState, "session" | "isAuthenticated"> {
  const session = getSession();
  return {
    session,
    isAuthenticated: Boolean(session?.token),
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...syncFromStorage(),

  hydrate: () => {
    set(syncFromStorage());
  },

  login: async (username, password) => {
    const result = await loginRequest(username, password);
    if (!result.ok) {
      set({ session: null, isAuthenticated: false });
      return { ok: false, message: result.message };
    }
    set({ session: result.session, isAuthenticated: true });
    await get().prepareLocalDb();
    return { ok: true };
  },

  logout: () => {
    // Policy 2A: keep IndexedDB + pending queue; only clear auth + query cache.
    stopSyncManager();
    closeUserDatabase();
    useSyncStore.getState().reset();
    clearAuth();
    queryClient.clear();
    set({ session: null, isAuthenticated: false });
  },

  touch: () => {
    const next = touchSession();
    if (!next) {
      clearSession();
      set({ session: null, isAuthenticated: false });
      return;
    }
    set({ session: next, isAuthenticated: true });
  },

  prepareLocalDb: async () => {
    const session = get().session ?? getSession();
    if (!session?.username) {
      useSyncStore.getState().setStatus({ dbReady: false });
      return;
    }
    await openUserDatabase(session.username);
    useSyncStore.getState().setStatus({ dbReady: true });
    startSyncManager();
    // Non-blocking initial / background sync
    void ensureInitialSync();
  },
}));

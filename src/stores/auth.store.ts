import { create } from "zustand";
import {
  clearSession,
  getSession,
  loginRequest,
  logout as clearAuth,
  saveSession,
  touchSession,
  type AuthSession,
} from "@/lib/auth";
import { apiFetch } from "@/api/client";
import { queryClient } from "@/lib/query-client";
import { closeUserDatabase, isDbOpen, openUserDatabase } from "@/db/database";
import {
  ensureInitialSync,
  startSyncManager,
  stopSyncManager,
} from "@/sync/syncManager";
import { useSyncStore } from "@/stores/sync.store";
import type { AuthMeResponse, PublicUser } from "@/config/permissions";
import { SYSTEM_ROLE_CODES } from "@/config/permissions";

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  user: PublicUser | null;
  roles: string[];
  permissions: string[];
  meLoaded: boolean;
  hydrate: () => void;
  login: (
    username: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => void;
  touch: () => void;
  loadMe: () => Promise<void>;
  /** Open IndexedDB for session user and await first-time sync gate. */
  prepareLocalDb: () => Promise<void>;
  hasPermission: (permission: string | string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasModuleAccess: (module: string) => boolean;
  hasRole: (role: string) => boolean;
}

function syncFromStorage(): Pick<AuthState, "session" | "isAuthenticated"> {
  const session = getSession();
  return {
    session,
    isAuthenticated: Boolean(session?.token),
  };
}

function clearAccessState(): Pick<
  AuthState,
  "user" | "roles" | "permissions" | "meLoaded"
> {
  return {
    user: null,
    roles: [],
    permissions: [],
    meLoaded: false,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...syncFromStorage(),
  ...clearAccessState(),

  hydrate: () => {
    set(syncFromStorage());
  },

  login: async (username, password) => {
    const result = await loginRequest(username, password);
    if (!result.ok) {
      set({ session: null, isAuthenticated: false, ...clearAccessState() });
      return { ok: false, message: result.message };
    }
    set({ session: result.session, isAuthenticated: true });
    await get().loadMe();
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
    set({ session: null, isAuthenticated: false, ...clearAccessState() });
  },

  touch: () => {
    const next = touchSession();
    if (!next) {
      clearSession();
      set({ session: null, isAuthenticated: false, ...clearAccessState() });
      return;
    }
    set({ session: next, isAuthenticated: true });
  },

  loadMe: async () => {
    const session = get().session ?? getSession();
    if (!session?.token) {
      set(clearAccessState());
      return;
    }
    try {
      const data = await apiFetch<AuthMeResponse>("/api/auth/me");
      set({
        user: data.user,
        roles: data.roles,
        permissions: data.permissions,
        meLoaded: true,
        session: {
          ...session,
          userId: data.user.id,
          username: data.user.username,
        },
      });
      saveSession({
        ...session,
        userId: data.user.id,
        username: data.user.username,
      });
    } catch {
      set(clearAccessState());
    }
  },

  prepareLocalDb: async () => {
    const session = get().session ?? getSession();
    if (!session?.username) {
      useSyncStore.getState().setStatus({
        dbReady: false,
        initialSyncReady: false,
        initialSyncPhase: "error",
        initialSyncError: "Phiên đăng nhập không hợp lệ",
      });
      return;
    }

    // login + RequireAuth both call this; skip re-entry once gate is ready
    if (isDbOpen() && useSyncStore.getState().initialSyncReady) {
      return;
    }

    useSyncStore.getState().setStatus({
      initialSyncReady: false,
      initialSyncPhase: "checking",
      initialSyncError: null,
    });
    await openUserDatabase(session.username);
    useSyncStore.getState().setStatus({ dbReady: true });
    startSyncManager();
    await ensureInitialSync();
  },

  hasPermission: (permission) => {
    const { permissions, roles } = get();
    if (roles.includes(SYSTEM_ROLE_CODES.SUPER_ADMIN)) return true;
    const needed = Array.isArray(permission) ? permission : [permission];
    return needed.every((p) => permissions.includes(p));
  },

  hasAnyPermission: (list) => {
    const { permissions, roles } = get();
    if (roles.includes(SYSTEM_ROLE_CODES.SUPER_ADMIN)) return true;
    return list.some((p) => permissions.includes(p));
  },

  hasAllPermissions: (list) => {
    const { permissions, roles } = get();
    if (roles.includes(SYSTEM_ROLE_CODES.SUPER_ADMIN)) return true;
    return list.every((p) => permissions.includes(p));
  },

  hasModuleAccess: (module) => {
    const { permissions, roles } = get();
    if (roles.includes(SYSTEM_ROLE_CODES.SUPER_ADMIN)) return true;
    const prefix = `${module}.`;
    // Module visible only when user has at least one *.view permission in that module
    return permissions.some(
      (p) => p.startsWith(prefix) && p.endsWith(".view"),
    );
  },

  hasRole: (role) => get().roles.includes(role),
}));

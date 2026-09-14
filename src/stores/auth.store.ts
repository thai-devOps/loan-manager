import { create } from "zustand";
import {
  clearSession,
  getSession,
  loginRequest,
  logout as clearAuth,
  touchSession,
  type AuthSession,
} from "@/lib/auth";

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
}

function syncFromStorage(): Pick<AuthState, "session" | "isAuthenticated"> {
  const session = getSession();
  return {
    session,
    isAuthenticated: Boolean(session?.token),
  };
}

export const useAuthStore = create<AuthState>((set) => ({
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
    return { ok: true };
  },

  logout: () => {
    clearAuth();
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
}));

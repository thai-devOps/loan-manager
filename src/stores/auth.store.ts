import { create } from "zustand";
import {
  attemptLogin,
  getSession,
  isSessionValid,
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
  ) => { ok: true } | { ok: false; message: string };
  logout: () => void;
  touch: () => void;
  checkExpiry: () => boolean;
}

function syncFromStorage(): Pick<AuthState, "session" | "isAuthenticated"> {
  const session = getSession();
  const valid = isSessionValid(session);
  if (!valid && session) {
    clearAuth();
  }
  return {
    session: valid ? session : null,
    isAuthenticated: valid,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...syncFromStorage(),

  hydrate: () => {
    set(syncFromStorage());
  },

  login: (username, password) => {
    const result = attemptLogin(username, password);
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
      set({ session: null, isAuthenticated: false });
      return;
    }
    set({ session: next, isAuthenticated: true });
  },

  checkExpiry: () => {
    const valid = isSessionValid(get().session ?? getSession());
    if (!valid) {
      clearAuth();
      set({ session: null, isAuthenticated: false });
    }
    return valid;
  },
}));

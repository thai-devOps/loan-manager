export const AUTH_STORAGE_KEY = "loan-manager.auth";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours of inactivity

export interface AuthSession {
  username: string;
  loggedInAt: string;
  lastActiveAt: string;
}

/**
 * Credentials are injected by Vite at build time from:
 * - VITE_ADMIN_USERNAME
 * - VITE_ADMIN_PASSWORD
 *
 * On Vercel these must be set in Project Settings → Environment Variables,
 * then the project must be redeployed.
 */
export function getAdminCredentials(): {
  username: string;
  password: string;
} | null {
  const username = String(import.meta.env.VITE_ADMIN_USERNAME ?? "").trim();
  const password = String(import.meta.env.VITE_ADMIN_PASSWORD ?? "").trim();

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (
      typeof parsed?.username !== "string" ||
      typeof parsed?.loggedInAt !== "string" ||
      typeof parsed?.lastActiveAt !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isSessionValid(
  session: AuthSession | null = getSession(),
): boolean {
  if (!session) return false;
  const lastActive = Date.parse(session.lastActiveAt);
  if (Number.isNaN(lastActive)) return false;
  return Date.now() - lastActive < SESSION_TTL_MS;
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function touchSession(): AuthSession | null {
  const session = getSession();
  if (!session || !isSessionValid(session)) {
    clearSession();
    return null;
  }
  const next: AuthSession = {
    ...session,
    lastActiveAt: new Date().toISOString(),
  };
  saveSession(next);
  return next;
}

export function attemptLogin(
  username: string,
  password: string,
): { ok: true; session: AuthSession } | { ok: false; message: string } {
  const expected = getAdminCredentials();
  if (!expected) {
    return {
      ok: false,
      message:
        "Cấu hình đăng nhập chưa sẵn sàng. Kiểm tra biến môi trường trên server rồi redeploy.",
    };
  }

  if (
    username.trim() !== expected.username ||
    password !== expected.password
  ) {
    return {
      ok: false,
      message: "Tên đăng nhập hoặc mật khẩu không đúng",
    };
  }

  const now = new Date().toISOString();
  const session: AuthSession = {
    username: expected.username,
    loggedInAt: now,
    lastActiveAt: now,
  };
  saveSession(session);
  return { ok: true, session };
}

export function logout(): void {
  clearSession();
}

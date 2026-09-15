export const AUTH_STORAGE_KEY = "monely.auth";
const LEGACY_AUTH_STORAGE_KEYS = ["vayly.auth", "loan-manager.auth"];

export interface AuthSession {
  token: string;
  username: string;
  loggedInAt: string;
  lastActiveAt: string;
}

export function getSession(): AuthSession | null {
  try {
    let raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_AUTH_STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (
      typeof parsed?.token !== "string" ||
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

export function saveSession(session: AuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  for (const key of LEGACY_AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  for (const key of LEGACY_AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

export function touchSession(): AuthSession | null {
  const session = getSession();
  if (!session) return null;
  const next: AuthSession = {
    ...session,
    lastActiveAt: new Date().toISOString(),
  };
  saveSession(next);
  return next;
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<
  { ok: true; session: AuthSession } | { ok: false; message: string }
> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
      }),
    });
    const data = (await res.json()) as {
      token?: string;
      username?: string;
      error?: string;
    };
    if (!res.ok || !data.token || !data.username) {
      return {
        ok: false,
        message: data.error ?? "Tên đăng nhập hoặc mật khẩu không đúng",
      };
    }
    const now = new Date().toISOString();
    const session: AuthSession = {
      token: data.token,
      username: data.username,
      loggedInAt: now,
      lastActiveAt: now,
    };
    saveSession(session);
    return { ok: true, session };
  } catch {
    return {
      ok: false,
      message: "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.",
    };
  }
}

export function logout(): void {
  clearSession();
}

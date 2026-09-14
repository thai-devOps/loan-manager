export const AUTH_STORAGE_KEY = "loan-manager.auth";

export interface AuthSession {
  token: string;
  username: string;
  loggedInAt: string;
  lastActiveAt: string;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
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
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
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

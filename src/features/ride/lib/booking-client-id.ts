const STORAGE_KEY = "bookingClientId";

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable anonymous client id for rate limiting (localStorage). */
export function getBookingClientId(): string {
  if (typeof window === "undefined") return newId();
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)?.trim();
    if (existing && existing.length >= 8) return existing;
    const id = newId();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return newId();
  }
}

export function newIdempotencyKey(): string {
  return newId();
}

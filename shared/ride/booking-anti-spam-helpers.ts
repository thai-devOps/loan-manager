/** Pure helpers for anti-spam (unit-tested). */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extract client IP from proxy headers (first hop of x-forwarded-for). */
export function pickClientIp(params: {
  forwardedFor?: string | string[] | null;
  realIp?: string | string[] | null;
  fallback?: string;
}): string {
  const forwarded = firstHeader(params.forwardedFor);
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = firstHeader(params.realIp)?.trim();
  if (realIp) return realIp;
  return params.fallback?.trim() || "unknown";
}

function firstHeader(raw: string | string[] | null | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

export function isValidIdempotencyKey(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== "string") return false;
  const key = raw.trim();
  return key.length >= 16 && key.length <= 128 && UUID_RE.test(key);
}

export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6) return "****";
  return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
}

export function maskIp(ip: string): string {
  if (!ip || ip === "unknown") return "unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 2).join(":")}:****`;
  }
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
  return "***";
}

export type RateWindowState = {
  count: number;
  windowStartMs: number;
  blockedUntilMs: number | null;
};

export type RateCheckResult =
  | { ok: true; next: RateWindowState }
  | { ok: false; blockedUntilMs: number; next: RateWindowState };

/**
 * Pure rate-window check used by Mongo wrapper.
 * If blockedUntil is in the future → reject.
 * If window expired → reset count to 1.
 * If count would exceed limit → set blockedUntil and reject.
 */
export function applyRateHit(
  state: RateWindowState | null,
  nowMs: number,
  windowMs: number,
  limit: number,
  blockMs: number,
): RateCheckResult {
  if (state?.blockedUntilMs != null && state.blockedUntilMs > nowMs) {
    return {
      ok: false,
      blockedUntilMs: state.blockedUntilMs,
      next: state,
    };
  }

  const windowStart =
    state && nowMs - state.windowStartMs < windowMs
      ? state.windowStartMs
      : nowMs;
  const prevCount =
    state && nowMs - state.windowStartMs < windowMs ? state.count : 0;
  const count = prevCount + 1;

  if (count > limit) {
    const blockedUntilMs = nowMs + blockMs;
    return {
      ok: false,
      blockedUntilMs,
      next: {
        count,
        windowStartMs: windowStart,
        blockedUntilMs,
      },
    };
  }

  return {
    ok: true,
    next: {
      count,
      windowStartMs: windowStart,
      blockedUntilMs: null,
    },
  };
}

export function rateLimitKey(
  kind: "ip" | "phone" | "phone24" | "client",
  id: string,
): string {
  return `booking:${kind}:${id}`;
}

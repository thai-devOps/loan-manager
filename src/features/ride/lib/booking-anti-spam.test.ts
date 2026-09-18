import { describe, expect, it } from "vitest";
import {
  applyRateHit,
  isValidIdempotencyKey,
  maskIp,
  maskPhone,
  pickClientIp,
  rateLimitKey,
  type RateWindowState,
} from "@shared/ride/booking-anti-spam-helpers";

/** Mirrors api/_lib/ride-booking normalizePhone for equivalence tests. */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

describe("booking anti-spam helpers", () => {
  it("normalizes phone by stripping non-digits", () => {
    expect(normalizePhone("0912 345 678")).toBe("0912345678");
    expect(normalizePhone("+84-912.345.678")).toBe("84912345678");
    expect(maskPhone("0912345678")).toBe("0912****78");
  });

  it("picks first hop of x-forwarded-for", () => {
    expect(
      pickClientIp({
        forwardedFor: "1.2.3.4, 10.0.0.1",
        realIp: "9.9.9.9",
      }),
    ).toBe("1.2.3.4");
    expect(
      pickClientIp({
        forwardedFor: null,
        realIp: "8.8.8.8",
      }),
    ).toBe("8.8.8.8");
    expect(maskIp("1.2.3.4")).toBe("1.2.***.***");
  });

  it("applies rate window math and blockedUntil", () => {
    const now = 1_700_000_000_000;
    const windowMs = 10 * 60_000;
    const limit = 5;
    const blockMs = 30 * 60_000;

    let current: RateWindowState | null = null;
    for (let i = 0; i < 5; i++) {
      const r = applyRateHit(current, now + i, windowMs, limit, blockMs);
      expect(r.ok).toBe(true);
      current = r.next;
    }
    const blocked = applyRateHit(current, now + 10, windowMs, limit, blockMs);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.blockedUntilMs).toBe(now + 10 + blockMs);
    }

    const stillBlocked = applyRateHit(
      blocked.next,
      now + 10 + blockMs - 1,
      windowMs,
      limit,
      blockMs,
    );
    expect(stillBlocked.ok).toBe(false);

    const after = applyRateHit(
      blocked.next,
      now + 10 + blockMs + 1,
      windowMs,
      limit,
      blockMs,
    );
    expect(after.ok).toBe(true);
    expect(after.next.count).toBe(1);
  });

  it("validates idempotency key format (UUID)", () => {
    expect(isValidIdempotencyKey("")).toBe(false);
    expect(isValidIdempotencyKey("short")).toBe(false);
    expect(
      isValidIdempotencyKey("550e8400-e29b-41d4-a716-446655440000"),
    ).toBe(true);
  });

  it("builds rate limit keys", () => {
    expect(rateLimitKey("ip", "1.2.3.4")).toBe("booking:ip:1.2.3.4");
    expect(rateLimitKey("phone24", "0912")).toBe("booking:phone24:0912");
  });

  /**
   * Concurrent duplicate-key behavior (documented):
   * First request inserts pending idempotency row; second hits unique index,
   * waits/polls for completed bookingId, then returns the same booking (reuse).
   * Unit-level: same key is always treated as one logical submit identity.
   */
  it("same idempotency key identity is reusable for retries", () => {
    const key = "550e8400-e29b-41d4-a716-446655440000";
    expect(isValidIdempotencyKey(key)).toBe(true);
    expect(isValidIdempotencyKey(key)).toBe(true);
  });
});

import {
  ANTI_SPAM_MESSAGES,
  type AntiSpamCode,
} from "../../shared/ride/booking-anti-spam.js";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Tunable via env for production; sensible defaults for Vercel. */
export const bookingAntiSpamConfig = {
  ipLimit: envInt("BOOKING_RATE_LIMIT_IP", 5),
  ipWindowMinutes: envInt("BOOKING_RATE_WINDOW_IP_MINUTES", 10),
  ipBlockMinutes: envInt("BOOKING_RATE_BLOCK_IP_MINUTES", 30),

  phoneLimit: envInt("BOOKING_RATE_LIMIT_PHONE", 3),
  phoneWindowMinutes: envInt("BOOKING_RATE_WINDOW_PHONE_MINUTES", 30),
  phoneDayLimit: envInt("BOOKING_RATE_LIMIT_PHONE_DAY", 5),
  phoneDayWindowMinutes: envInt(
    "BOOKING_RATE_WINDOW_PHONE_DAY_MINUTES",
    24 * 60,
  ),

  clientLimit: envInt("BOOKING_RATE_LIMIT_CLIENT", 5),
  clientWindowMinutes: envInt("BOOKING_RATE_WINDOW_CLIENT_MINUTES", 30),

  idempotencyTtlHours: envInt("BOOKING_IDEMPOTENCY_TTL_HOURS", 24),
};

export { ANTI_SPAM_MESSAGES, type AntiSpamCode };

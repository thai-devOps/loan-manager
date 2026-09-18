import {
  ANTI_SPAM_MESSAGES,
  bookingAntiSpamConfig,
  type AntiSpamCode,
} from "./booking-anti-spam-config.js";
import {
  applyRateHit,
  maskIp,
  maskPhone,
  rateLimitKey,
} from "../../shared/ride/booking-anti-spam-helpers.js";
import {
  rideBookingRateLimitsCol,
  type RideBookingRateLimitDoc,
} from "./mongo.js";

export type RateLimitFailure = {
  code: AntiSpamCode;
  message: string;
  httpStatus: 429;
};

function logRateLimited(
  type: string,
  masked: string,
): void {
  console.info(
    JSON.stringify({
      event: "booking_rate_limited",
      type,
      masked,
      timestamp: new Date().toISOString(),
      route: "POST /api/ride/bookings",
    }),
  );
}

async function hitLimit(params: {
  key: string;
  type: RideBookingRateLimitDoc["type"];
  limit: number;
  windowMs: number;
  blockMs: number;
  code: AntiSpamCode;
  logId: string;
}): Promise<RateLimitFailure | null> {
  const col = await rideBookingRateLimitsCol();
  const now = Date.now();
  const existing = await col.findOne({ key: params.key });

  const result = applyRateHit(
    existing
      ? {
          count: existing.count,
          windowStartMs: new Date(existing.windowStart).getTime(),
          blockedUntilMs: existing.blockedUntil
            ? new Date(existing.blockedUntil).getTime()
            : null,
        }
      : null,
    now,
    params.windowMs,
    params.limit,
    params.blockMs,
  );

  const expiresAt = new Date(
    Math.max(
      result.next.windowStartMs + params.windowMs,
      result.next.blockedUntilMs ?? 0,
      now,
    ) + 60_000,
  );
  const nowIso = new Date(now).toISOString();

  await col.updateOne(
    { key: params.key },
    {
      $set: {
        key: params.key,
        type: params.type,
        count: result.next.count,
        windowStart: new Date(result.next.windowStartMs).toISOString(),
        blockedUntil: result.next.blockedUntilMs
          ? new Date(result.next.blockedUntilMs).toISOString()
          : null,
        expiresAt,
        updatedAt: nowIso,
      },
      $setOnInsert: {
        createdAt: nowIso,
      },
    },
    { upsert: true },
  );

  if (!result.ok) {
    logRateLimited(params.type, params.logId);
    return {
      code: params.code,
      message: ANTI_SPAM_MESSAGES[params.code],
      httpStatus: 429,
    };
  }
  return null;
}

export async function assertBookingRateLimits(params: {
  ip: string;
  normalizedPhone: string;
  clientId?: string | null;
}): Promise<RateLimitFailure | null> {
  const cfg = bookingAntiSpamConfig;

  const ipFail = await hitLimit({
    key: rateLimitKey("ip", params.ip),
    type: "ip",
    limit: cfg.ipLimit,
    windowMs: cfg.ipWindowMinutes * 60_000,
    blockMs: cfg.ipBlockMinutes * 60_000,
    code: "RATE_LIMITED",
    logId: maskIp(params.ip),
  });
  if (ipFail) return ipFail;

  const phoneFail = await hitLimit({
    key: rateLimitKey("phone", params.normalizedPhone),
    type: "phone",
    limit: cfg.phoneLimit,
    windowMs: cfg.phoneWindowMinutes * 60_000,
    blockMs: cfg.phoneWindowMinutes * 60_000,
    code: "PHONE_RATE_LIMITED",
    logId: maskPhone(params.normalizedPhone),
  });
  if (phoneFail) return phoneFail;

  const phoneDayFail = await hitLimit({
    key: rateLimitKey("phone24", params.normalizedPhone),
    type: "phone24",
    limit: cfg.phoneDayLimit,
    windowMs: cfg.phoneDayWindowMinutes * 60_000,
    blockMs: cfg.phoneDayWindowMinutes * 60_000,
    code: "PHONE_RATE_LIMITED",
    logId: maskPhone(params.normalizedPhone),
  });
  if (phoneDayFail) return phoneDayFail;

  const clientId = params.clientId?.trim();
  if (clientId && clientId.length >= 8 && clientId.length <= 128) {
    const clientFail = await hitLimit({
      key: rateLimitKey("client", clientId),
      type: "client",
      limit: cfg.clientLimit,
      windowMs: cfg.clientWindowMinutes * 60_000,
      blockMs: cfg.clientWindowMinutes * 60_000,
      code: "CLIENT_RATE_LIMITED",
      logId: `${clientId.slice(0, 8)}…`,
    });
    if (clientFail) return clientFail;
  }

  return null;
}

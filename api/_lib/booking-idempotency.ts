import { MongoServerError } from "mongodb";
import {
  ANTI_SPAM_MESSAGES,
  bookingAntiSpamConfig,
} from "./booking-anti-spam-config.js";
import { isValidIdempotencyKey } from "../../shared/ride/booking-anti-spam-helpers.js";
import {
  rideBookingIdempotencyCol,
  rideBookingsCol,
  stripDoc,
} from "./mongo.js";
import type { RideBooking } from "./ride-types.js";

export type IdempotencyClaim =
  | { kind: "new"; key: string }
  | { kind: "reuse"; booking: Omit<RideBooking, "_id"> }
  | {
      kind: "error";
      code: "INVALID_IDEMPOTENCY_KEY";
      message: string;
      httpStatus: 400;
    };

function expiresAtDate(): Date {
  const hours = bookingAntiSpamConfig.idempotencyTtlHours;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function loadBookingById(
  bookingId: string,
): Promise<Omit<RideBooking, "_id"> | null> {
  const bookings = await rideBookingsCol();
  const row = await bookings.findOne({ id: bookingId });
  return row ? (stripDoc(row) as Omit<RideBooking, "_id">) : null;
}

async function waitForCompleted(
  key: string,
  attempts = 8,
): Promise<Omit<RideBooking, "_id"> | null> {
  const col = await rideBookingIdempotencyCol();
  for (let i = 0; i < attempts; i++) {
    const row = await col.findOne({ key });
    if (row?.status === "completed" && row.bookingId) {
      const booking = await loadBookingById(row.bookingId);
      if (booking) return booking;
    }
    await new Promise((r) => setTimeout(r, 40 + i * 20));
  }
  return null;
}

/**
 * Claim an idempotency key before creating a booking.
 * Unique index on `key` prevents concurrent double-create.
 */
export async function claimIdempotencyKey(
  rawKey: string | null | undefined,
): Promise<IdempotencyClaim> {
  if (!isValidIdempotencyKey(rawKey)) {
    return {
      kind: "error",
      code: "INVALID_IDEMPOTENCY_KEY",
      message: ANTI_SPAM_MESSAGES.INVALID_IDEMPOTENCY_KEY,
      httpStatus: 400,
    };
  }
  const key = String(rawKey).trim();
  const col = await rideBookingIdempotencyCol();
  const now = new Date().toISOString();

  try {
    await col.insertOne({
      key,
      bookingId: null,
      status: "pending",
      createdAt: now,
      expiresAt: expiresAtDate(),
    });
    return { kind: "new", key };
  } catch (e) {
    if (e instanceof MongoServerError && e.code === 11000) {
      console.info(
        JSON.stringify({
          event: "booking_duplicate_submit",
          timestamp: now,
          route: "POST /api/ride/bookings",
        }),
      );
      const existing = await col.findOne({ key });
      if (existing?.status === "completed" && existing.bookingId) {
        const booking = await loadBookingById(existing.bookingId);
        if (booking) return { kind: "reuse", booking };
      }
      const waited = await waitForCompleted(key);
      if (waited) return { kind: "reuse", booking: waited };
      return {
        kind: "error",
        code: "INVALID_IDEMPOTENCY_KEY",
        message: ANTI_SPAM_MESSAGES.INVALID_IDEMPOTENCY_KEY,
        httpStatus: 400,
      };
    }
    throw e;
  }
}

export async function completeIdempotencyKey(
  key: string,
  bookingId: string,
): Promise<void> {
  const col = await rideBookingIdempotencyCol();
  await col.updateOne(
    { key },
    {
      $set: {
        bookingId,
        status: "completed",
        expiresAt: expiresAtDate(),
      },
    },
  );
}

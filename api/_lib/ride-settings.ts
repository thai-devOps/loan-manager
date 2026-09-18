import { rideSettingsCol } from "./mongo.js";
import { envBookingAntiSpamEnabled } from "./booking-anti-spam-config.js";

const SETTINGS_ID = "default";

export type RideSettings = {
  _id?: string;
  id: string;
  /** null/undefined = follow env BOOKING_ANTI_SPAM_ENABLED */
  bookingAntiSpamEnabled?: boolean | null;
  updatedAt: string;
  createdAt: string;
};

export type RideSettingsPublic = {
  bookingAntiSpamEnabled: boolean;
  /** True when value comes from Mongo override, false when from env default */
  bookingAntiSpamSource: "mongo" | "env";
  envDefault: boolean;
};

async function ensureSettingsDoc(): Promise<RideSettings> {
  const col = await rideSettingsCol();
  const existing = await col.findOne({ id: SETTINGS_ID });
  if (existing) {
    return existing as RideSettings;
  }
  const now = new Date().toISOString();
  const doc: RideSettings = {
    _id: SETTINGS_ID,
    id: SETTINGS_ID,
    bookingAntiSpamEnabled: null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await col.insertOne(doc);
  } catch {
    const again = await col.findOne({ id: SETTINGS_ID });
    if (again) return again as RideSettings;
  }
  return doc;
}

export async function getRideSettings(): Promise<RideSettingsPublic> {
  const doc = await ensureSettingsDoc();
  const envDefault = envBookingAntiSpamEnabled();
  if (typeof doc.bookingAntiSpamEnabled === "boolean") {
    return {
      bookingAntiSpamEnabled: doc.bookingAntiSpamEnabled,
      bookingAntiSpamSource: "mongo",
      envDefault,
    };
  }
  return {
    bookingAntiSpamEnabled: envDefault,
    bookingAntiSpamSource: "env",
    envDefault,
  };
}

/** Effective flag used by POST /api/ride/bookings */
export async function isBookingAntiSpamEnabled(): Promise<boolean> {
  const s = await getRideSettings();
  return s.bookingAntiSpamEnabled;
}

export async function updateRideSettings(input: {
  bookingAntiSpamEnabled?: boolean | null;
}): Promise<RideSettingsPublic> {
  await ensureSettingsDoc();
  const col = await rideSettingsCol();
  const now = new Date().toISOString();
  const $set: Record<string, unknown> = { updatedAt: now };
  if ("bookingAntiSpamEnabled" in input) {
    $set.bookingAntiSpamEnabled = input.bookingAntiSpamEnabled;
  }
  await col.updateOne({ id: SETTINGS_ID }, { $set });
  return getRideSettings();
}

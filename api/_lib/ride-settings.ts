import { rideSettingsCol } from "./mongo.js";
import { envBookingAntiSpamEnabled } from "./booking-anti-spam-config.js";
import { isPricingEngineV2Enabled } from "./pricing-v2/feature-flag.js";

const SETTINGS_ID = "default";
const DEFAULT_OPERATIONAL_DISTANCE_FACTOR = 1.0;

export type RideSettings = {
  _id?: string;
  id: string;
  /** null/undefined = follow env BOOKING_ANTI_SPAM_ENABLED */
  bookingAntiSpamEnabled?: boolean | null;
  /** Multiplier for fuel operational distance (billableKm * factor). ≥ 1. */
  operationalDistanceFactor?: number | null;
  updatedAt: string;
  createdAt: string;
};

export type RideSettingsPublic = {
  bookingAntiSpamEnabled: boolean;
  /** True when value comes from Mongo override, false when from env default */
  bookingAntiSpamSource: "mongo" | "env";
  envDefault: boolean;
  operationalDistanceFactor: number;
  /** Env PRICING_ENGINE_V2 — admin calculator / booking auto-quote path. */
  pricingEngineV2Enabled: boolean;
};

function normalizeFactor(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_OPERATIONAL_DISTANCE_FACTOR;
  return n;
}

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
    operationalDistanceFactor: DEFAULT_OPERATIONAL_DISTANCE_FACTOR,
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
  const operationalDistanceFactor = normalizeFactor(
    doc.operationalDistanceFactor,
  );
  const pricingEngineV2Enabled = isPricingEngineV2Enabled();
  if (typeof doc.bookingAntiSpamEnabled === "boolean") {
    return {
      bookingAntiSpamEnabled: doc.bookingAntiSpamEnabled,
      bookingAntiSpamSource: "mongo",
      envDefault,
      operationalDistanceFactor,
      pricingEngineV2Enabled,
    };
  }
  return {
    bookingAntiSpamEnabled: envDefault,
    bookingAntiSpamSource: "env",
    envDefault,
    operationalDistanceFactor,
    pricingEngineV2Enabled,
  };
}

/** Effective flag used by POST /api/ride/bookings */
export async function isBookingAntiSpamEnabled(): Promise<boolean> {
  const s = await getRideSettings();
  return s.bookingAntiSpamEnabled;
}

export async function getOperationalDistanceFactor(): Promise<number> {
  const s = await getRideSettings();
  return s.operationalDistanceFactor;
}

export async function updateRideSettings(input: {
  bookingAntiSpamEnabled?: boolean | null;
  operationalDistanceFactor?: number | null;
}): Promise<RideSettingsPublic> {
  await ensureSettingsDoc();
  const col = await rideSettingsCol();
  const now = new Date().toISOString();
  const $set: Record<string, unknown> = { updatedAt: now };
  if ("bookingAntiSpamEnabled" in input) {
    $set.bookingAntiSpamEnabled = input.bookingAntiSpamEnabled;
  }
  if ("operationalDistanceFactor" in input) {
    if (
      input.operationalDistanceFactor != null &&
      (typeof input.operationalDistanceFactor !== "number" ||
        !Number.isFinite(input.operationalDistanceFactor) ||
        input.operationalDistanceFactor < 1)
    ) {
      throw new Error("Hệ số quãng đường vận hành phải ≥ 1.");
    }
    $set.operationalDistanceFactor =
      input.operationalDistanceFactor == null
        ? DEFAULT_OPERATIONAL_DISTANCE_FACTOR
        : input.operationalDistanceFactor;
  }
  await col.updateOne({ id: SETTINGS_ID }, { $set });
  return getRideSettings();
}

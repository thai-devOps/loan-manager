import { MongoClient, type Db, type Collection } from "mongodb";
import type { Borrower } from "./types.js";
import type { Loan } from "./types.js";
import type { InterestSchedule } from "./types.js";
import type { Transaction } from "./types.js";
import type {
  AssetSettings,
  AssetSnapshot,
  FinanceTransaction,
  GoldPlan,
  GoldPurchase,
  ManualAsset,
} from "./types.js";
import type {
  RideBooking,
  RideCustomer,
  RideDriver,
  RideTrip,
  RideVehicle,
} from "./ride-types.js";
import type { AppRole, AppUser, AuditLog } from "./access/types.js";

const uri = process.env.MONGODB_URI;
const DB_NAME = "loan-db";

type GlobalMongo = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

async function getClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  const g = globalThis as GlobalMongo;
  if (!g._mongoClientPromise) {
    const client = new MongoClient(uri);
    g._mongoClientPromise = client.connect();
  }
  return g._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  await ensureIndexes(db);
  return db;
}

let indexesReady = false;

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesReady) return;
  await Promise.all([
    db.collection("borrowers").createIndex({ name: 1 }),
    db.collection("borrowers").createIndex({ phone: 1 }),
    db.collection("loans").createIndex({ borrowerId: 1, status: 1 }),
    db.collection("interestSchedules").createIndex({ loanId: 1, dueDate: 1 }),
    db.collection("interestSchedules").createIndex({ status: 1 }),
    db.collection("transactions").createIndex({ loanId: 1, type: 1 }),
    db.collection("transactions").createIndex({ transactionDate: 1 }),
    db.collection("finance_transactions").createIndex({ date: 1 }),
    db.collection("finance_transactions").createIndex({ type: 1 }),
    db.collection("assets").createIndex({ type: 1 }),
    db.collection("gold_purchases").createIndex({ purchaseDate: 1 }),
    db.collection("gold_purchases").createIndex({ type: 1 }),
    db.collection("asset_snapshots").createIndex({ month: 1 }, { unique: true }),
    db
      .collection("ride_bookings")
      .createIndex({ bookingCode: 1 }, { unique: true }),
    db.collection("ride_bookings").createIndex({ "customer.phone": 1 }),
    db.collection("ride_bookings").createIndex({ pickupDate: 1 }),
    db.collection("ride_bookings").createIndex({ status: 1 }),
    db.collection("ride_bookings").createIndex({ vehicleId: 1, pickupDate: 1 }),
    db.collection("ride_bookings").createIndex({ driverId: 1, pickupDate: 1 }),
    db.collection("ride_vehicles").createIndex({ status: 1 }),
    db.collection("ride_vehicles").createIndex({ active: 1 }),
    db.collection("ride_drivers").createIndex({ phone: 1 }),
    db.collection("ride_drivers").createIndex({ status: 1 }),
    db.collection("ride_customers").createIndex({ phone: 1 }, { unique: true }),
    db.collection("ride_trips").createIndex({ bookingId: 1 }),
    db.collection("users").createIndex({ username: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ status: 1 }),
    db.collection("roles").createIndex({ code: 1 }, { unique: true }),
    db.collection("audit_logs").createIndex({ createdAt: -1 }),
    db.collection("audit_logs").createIndex({ actorId: 1 }),
    db.collection("audit_logs").createIndex({ targetType: 1, targetId: 1 }),
  ]);
  indexesReady = true;
}

export async function borrowersCol(): Promise<Collection<Borrower>> {
  return (await getDb()).collection<Borrower>("borrowers");
}

export async function loansCol(): Promise<Collection<Loan>> {
  return (await getDb()).collection<Loan>("loans");
}

export async function schedulesCol(): Promise<Collection<InterestSchedule>> {
  return (await getDb()).collection<InterestSchedule>("interestSchedules");
}

export async function transactionsCol(): Promise<Collection<Transaction>> {
  return (await getDb()).collection<Transaction>("transactions");
}

export async function financeTransactionsCol(): Promise<
  Collection<FinanceTransaction>
> {
  return (await getDb()).collection<FinanceTransaction>("finance_transactions");
}

export async function assetsCol(): Promise<Collection<ManualAsset>> {
  return (await getDb()).collection<ManualAsset>("assets");
}

export async function goldPurchasesCol(): Promise<Collection<GoldPurchase>> {
  return (await getDb()).collection<GoldPurchase>("gold_purchases");
}

export async function goldPlansCol(): Promise<Collection<GoldPlan>> {
  return (await getDb()).collection<GoldPlan>("gold_plans");
}

export async function assetSettingsCol(): Promise<Collection<AssetSettings>> {
  return (await getDb()).collection<AssetSettings>("asset_settings");
}

export async function assetSnapshotsCol(): Promise<Collection<AssetSnapshot>> {
  return (await getDb()).collection<AssetSnapshot>("asset_snapshots");
}

export async function rideVehiclesCol(): Promise<Collection<RideVehicle>> {
  return (await getDb()).collection<RideVehicle>("ride_vehicles");
}

export async function rideDriversCol(): Promise<Collection<RideDriver>> {
  return (await getDb()).collection<RideDriver>("ride_drivers");
}

export async function rideCustomersCol(): Promise<Collection<RideCustomer>> {
  return (await getDb()).collection<RideCustomer>("ride_customers");
}

export async function rideBookingsCol(): Promise<Collection<RideBooking>> {
  return (await getDb()).collection<RideBooking>("ride_bookings");
}

export async function rideTripsCol(): Promise<Collection<RideTrip>> {
  return (await getDb()).collection<RideTrip>("ride_trips");
}

export async function usersCol(): Promise<Collection<AppUser>> {
  return (await getDb()).collection<AppUser>("users");
}

export async function rolesCol(): Promise<Collection<AppRole>> {
  return (await getDb()).collection<AppRole>("roles");
}

export async function auditLogsCol(): Promise<Collection<AuditLog>> {
  return (await getDb()).collection<AuditLog>("audit_logs");
}

/** Strip MongoDB-only fields for API responses */
export function stripDoc<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _unused, ...rest } = doc;
  void _unused;
  return rest;
}

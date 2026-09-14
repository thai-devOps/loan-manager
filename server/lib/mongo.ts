import { MongoClient, type Db, type Collection } from "mongodb";
import type { Borrower } from "./types.js";
import type { Loan } from "./types.js";
import type { InterestSchedule } from "./types.js";
import type { Transaction } from "./types.js";

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

/** Strip MongoDB-only fields for API responses */
export function stripDoc<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _unused, ...rest } = doc;
  void _unused;
  return rest;
}

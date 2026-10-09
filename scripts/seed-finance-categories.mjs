/**
 * Idempotent seed for finance_categories.
 * Inserts missing type+key only. Does not overwrite name, icon, or color.
 *
 *   node scripts/seed-finance-categories.mjs
 *
 * Reads MONGODB_URI from .env. Does not print the connection string.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { DEFAULT_FINANCE_CATEGORIES } from "../shared/finance/default-categories.mjs";

function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env optional when the variable is already exported
  }
}

loadEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Thiếu MONGODB_URI. Thêm vào .env rồi chạy lại.");
  process.exit(1);
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const col = client.db().collection("finance_categories");
  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;
  for (const item of DEFAULT_FINANCE_CATEGORIES) {
    const existing = await col.findOne({ type: item.type, key: item.key });
    if (existing) {
      skipped += 1;
      continue;
    }
    const id = randomUUID();
    await col.insertOne({
      _id: id,
      id,
      key: item.key,
      name: item.name,
      nameNormalized: normalizeName(item.name),
      description: item.description,
      type: item.type,
      icon: item.icon,
      color: item.color,
      isActive: true,
      sortOrder: item.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
    inserted += 1;
  }
  console.log(`finance_categories: inserted ${inserted}, skipped ${skipped}`);
} finally {
  await client.close();
}

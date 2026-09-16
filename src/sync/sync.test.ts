import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import {
  closeUserDatabase,
  getDb,
  openUserDatabase,
  MonelyDatabase,
} from "@/db/database";
import { dbNameForUser } from "@/db/schema";
import { financeRepository } from "@/db/repositories/financeRepository";
import { borrowerRepository } from "@/db/repositories/borrowerRepository";
import {
  countPendingOps,
  enqueueSyncOp,
  listPendingOps,
  markDone,
} from "@/sync/syncQueue";
import { syncPush } from "@/sync/syncPush";
import { syncPull } from "@/sync/syncPull";
import type { SyncTransport } from "@/sync/transports/types";

async function resetUserDb(username: string): Promise<void> {
  closeUserDatabase();
  await Dexie.delete(dbNameForUser(username));
  await openUserDatabase(username);
}

describe("local-first IndexedDB", () => {
  beforeEach(async () => {
    await resetUserDb("testuser");
  });

  afterEach(async () => {
    closeUserDatabase();
    await Dexie.delete(dbNameForUser("testuser"));
    await Dexie.delete(dbNameForUser("otheruser"));
    await Dexie.delete(dbNameForUser("migrate_user"));
    vi.restoreAllMocks();
  });

  it("isolates databases by username", () => {
    expect(dbNameForUser("alice")).toBe("monely_alice");
    expect(dbNameForUser("bob")).toBe("monely_bob");
    expect(dbNameForUser("alice")).not.toBe(dbNameForUser("bob"));
  });

  it("persists finance create offline and keeps queue", async () => {
    const created = await financeRepository.create({
      type: "expense",
      category: "food",
      amount: 50_000,
      date: "2026-09-16",
      description: "Ăn trưa",
    });

    closeUserDatabase();
    await openUserDatabase("testuser");

    const listed = await financeRepository.list();
    expect(listed.some((r) => r.id === created.id)).toBe(true);
    expect(await countPendingOps()).toBeGreaterThanOrEqual(1);
  });

  it("update and soft-delete offline survive reload", async () => {
    const created = await financeRepository.create({
      type: "income",
      category: "salary",
      amount: 1_000_000,
      date: "2026-09-01",
      description: "Lương",
    });

    await financeRepository.update(created.id, {
      type: "income",
      category: "salary",
      amount: 1_200_000,
      date: "2026-09-01",
      description: "Lương cập nhật",
    });

    await financeRepository.remove(created.id);

    closeUserDatabase();
    await openUserDatabase("testuser");

    const listed = await financeRepository.list();
    expect(listed.find((r) => r.id === created.id)).toBeUndefined();
    const tombstone = await getDb().financeTransactions.get(created.id);
    expect(tombstone?.deletedAt).toBeTruthy();
    expect(await countPendingOps()).toBeGreaterThanOrEqual(1);
  });

  it("dedupes sync queue by opId", async () => {
    const opId = crypto.randomUUID();
    await enqueueSyncOp({
      opId,
      entity: "borrower",
      entityId: "b1",
      action: "create",
      payload: { name: "A" },
    });
    await enqueueSyncOp({
      opId,
      entity: "borrower",
      entityId: "b1",
      action: "create",
      payload: { name: "A" },
    });
    const pending = await listPendingOps();
    expect(pending.filter((p) => p.opId === opId)).toHaveLength(1);
  });

  it("keeps queue when push fails", async () => {
    await borrowerRepository.create({ name: "Offline User" });
    const failingTransport: SyncTransport = {
      pullAll: async () => [],
      pushOne: async () => ({
        ok: false,
        error: "network",
        retryable: true,
      }),
    };

    const result = await syncPush(failingTransport);
    expect(result.failed).toBeGreaterThan(0);
    expect(await countPendingOps()).toBeGreaterThan(0);
  });

  it("pushes once then removes queue item on success", async () => {
    const borrower = await borrowerRepository.create({ name: "Online User" });
    let pushCalls = 0;
    const transport: SyncTransport = {
      pullAll: async () => [],
      pushOne: async (item) => {
        pushCalls += 1;
        return {
          ok: true,
          serverRecord: { id: borrower.id, ...item.payload },
        };
      },
    };

    await syncPush(transport);
    expect(pushCalls).toBe(1);
    expect(await countPendingOps()).toBe(0);

    await syncPush(transport);
    expect(pushCalls).toBe(1);
  });

  it("pull reconcile upserts and deletes missing remote rows", async () => {
    await getDb().borrowers.put({
      id: "gone",
      name: "Removed remotely",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
    });

    const transport: SyncTransport = {
      pullAll: async () => [
        {
          entity: "borrower",
          rows: [
            {
              id: "keep",
              name: "Keep",
              createdAt: "2026-01-02T00:00:00.000Z",
              updatedAt: "2026-01-02T00:00:00.000Z",
            },
          ],
        },
        { entity: "loan", rows: [] },
        { entity: "loanTransaction", rows: [] },
        { entity: "interestSchedule", rows: [] },
        { entity: "financeTransaction", rows: [] },
        { entity: "manualAsset", rows: [] },
        { entity: "goldPurchase", rows: [] },
        { entity: "goldPlan", rows: [] },
        {
          entity: "assetSettings",
          rows: [
            {
              id: "default",
              goldReferencePricePerChi: { "9999": 0, "18k": 0, other: 0 },
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        },
      ],
      pushOne: async () => ({ ok: true }),
    };

    await syncPull(transport);
    expect(await getDb().borrowers.get("gone")).toBeUndefined();
    expect((await getDb().borrowers.get("keep"))?.name).toBe("Keep");
  });

  it("schema migration v1 opens cleanly", async () => {
    closeUserDatabase();
    const db = new MonelyDatabase("migrate_user");
    await db.open();
    expect(db.verno).toBe(1);
    db.close();
  });

  it("does not wipe other user data on close", async () => {
    await financeRepository.create({
      type: "expense",
      category: "food",
      amount: 10_000,
      date: "2026-09-16",
      description: "User A",
    });
    closeUserDatabase();

    await openUserDatabase("otheruser");
    expect(await financeRepository.list()).toHaveLength(0);
    closeUserDatabase();

    await openUserDatabase("testuser");
    expect((await financeRepository.list()).length).toBeGreaterThan(0);
  });

  it("markDone removes queue item", async () => {
    const item = await enqueueSyncOp({
      entity: "financeTransaction",
      entityId: "x",
      action: "create",
      payload: {},
    });
    expect(item.localId).toBeDefined();
    await markDone(item.localId!);
    expect(await countPendingOps()).toBe(0);
  });
});

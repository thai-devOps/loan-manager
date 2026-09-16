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
  markSyncing,
  reclaimSyncingOps,
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

  it("persists finance create offline and keeps queue as pending", async () => {
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
    const pending = await listPendingOps();
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending.every((p) => p.status === "pending")).toBe(true);
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

  it("network retryable failure keeps status pending (not failed)", async () => {
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
    expect(result.failed).toBe(0);
    expect(result.deferred).toBeGreaterThan(0);
    const pending = await listPendingOps();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((p) => p.status === "pending")).toBe(true);
    expect(pending.some((p) => p.lastError === "network")).toBe(true);
  });

  it("reclaims orphaned syncing ops so they can push again", async () => {
    const item = await enqueueSyncOp({
      entity: "borrower",
      entityId: "orphan",
      action: "create",
      payload: { name: "Orphan" },
    });
    expect(item.localId).toBeDefined();
    await markSyncing(item.localId!);

    const stuck = await getDb().syncQueue.get(item.localId!);
    expect(stuck?.status).toBe("syncing");

    const reclaimed = await reclaimSyncingOps();
    expect(reclaimed).toBe(1);
    expect((await getDb().syncQueue.get(item.localId!))?.status).toBe(
      "pending",
    );

    let pushCalls = 0;
    const transport: SyncTransport = {
      pullAll: async () => [],
      pushOne: async () => {
        pushCalls += 1;
        return { ok: true, serverRecord: { id: "orphan" } };
      },
    };
    await syncPush(transport);
    expect(pushCalls).toBe(1);
    expect(await countPendingOps()).toBe(0);
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

  it("after network deferral, successful push clears queue", async () => {
    const borrower = await borrowerRepository.create({ name: "Retry User" });
    let attempts = 0;
    const transport: SyncTransport = {
      pullAll: async () => [],
      pushOne: async (item) => {
        attempts += 1;
        if (attempts === 1) {
          return { ok: false, error: "offline", retryable: true };
        }
        return {
          ok: true,
          serverRecord: { id: borrower.id, ...item.payload },
        };
      },
    };

    const first = await syncPush(transport);
    expect(first.deferred).toBeGreaterThan(0);
    expect(await countPendingOps()).toBeGreaterThan(0);

    const second = await syncPush(transport);
    expect(second.pushed).toBeGreaterThan(0);
    expect(await countPendingOps()).toBe(0);
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

  it("stops auto-retry after max retries and keeps failed", async () => {
    await enqueueSyncOp({
      entity: "borrower",
      entityId: "max-retry",
      action: "create",
      payload: { name: "Max" },
    });
    // Simulate already at 9 retries → next failure marks failed
    const rows = await getDb().syncQueue.toArray();
    const row = rows[0]!;
    await getDb().syncQueue.update(row.localId!, { retryCount: 9 });

    const transport: SyncTransport = {
      pullAll: async () => [],
      pushOne: async () => ({
        ok: false,
        error: "still failing",
        retryable: true,
      }),
    };
    const result = await syncPush(transport);
    expect(result.failed).toBe(1);
    expect(result.deferred).toBe(0);

    const after = await getDb().syncQueue.toArray();
    expect(after[0]?.status).toBe("failed");
    expect(after[0]?.retryCount).toBe(10);

    // Auto push must not pick failed again
    const second = await syncPush(transport);
    expect(second.pushed + second.failed + second.deferred).toBe(0);
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

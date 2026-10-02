import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/pvoil",
);

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

const findOne = vi.fn();
const updateOne = vi.fn();
const find = vi.fn();
const countDocuments = vi.fn();

vi.mock("../../../../api/_lib/mongo", () => ({
  fuelPriceSnapshotsCol: async () => ({
    findOne,
    updateOne,
    find,
    countDocuments,
  }),
}));

describe("syncPvoilDate", () => {
  const prevOrigin = process.env.PVOIL_ORIGIN_IP;

  beforeEach(() => {
    vi.resetModules();
    findOne.mockReset();
    updateOne.mockReset();
    find.mockReset();
    countDocuments.mockReset();
    vi.unstubAllGlobals();
    // Keep unit tests offline — sync mocks `fetch`, not origin-IP https.
    process.env.PVOIL_ORIGIN_IP = "off";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (prevOrigin === undefined) delete process.env.PVOIL_ORIGIN_IP;
    else process.env.PVOIL_ORIGIN_IP = prevOrigin;
  });

  it("returns already_synced without calling PVOIL when snapshot exists", async () => {
    const existing = {
      id: "snap-1",
      source: "PVOIL" as const,
      effectiveAt: "2026-10-01T08:00:00.000Z",
      effectiveDateRaw: "01/10/2026 15:00:00",
      products: [{ code: "E10_RON95_III", name: "x", price: 1, change: 0, unit: "VND/L" as const }],
      sourceUrl: "https://example.com",
      crawledAt: "2026-10-01T09:00:00.000Z",
      createdAt: "2026-10-01T09:00:00.000Z",
      updatedAt: "2026-10-01T09:00:00.000Z",
    };
    findOne.mockResolvedValue(existing);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { syncPvoilDate } = await import(
      "../../../../api/_lib/fuel-price/sync-service"
    );
    const result = await syncPvoilDate("01/10/2026 15:00:00");
    expect(result.status).toBe("already_synced");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("does not overwrite when validation fails", async () => {
    findOne.mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () =>
          new TextEncoder().encode(
            loadFixture("price-table-missing-required.html"),
          ).buffer,
      }),
    );

    const { syncPvoilDate } = await import(
      "../../../../api/_lib/fuel-price/sync-service"
    );
    await expect(syncPvoilDate("01/10/2026 15:00:00")).rejects.toMatchObject({
      code: "PVOIL_VALIDATION_FAILED",
    });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("upserts a valid sync", async () => {
    findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "new-id",
        source: "PVOIL",
        effectiveAt: "2026-10-01T08:00:00.000Z",
        effectiveDateRaw: "01/10/2026 15:00:00",
        products: [],
        sourceUrl: "https://www.pvoil.com.vn/api/oilprice/load-view?date=01%2F10%2F2026%2015%3A00%3A00",
        crawledAt: "2026-10-01T10:00:00.000Z",
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
      });
    updateOne.mockResolvedValue({ acknowledged: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () =>
          new TextEncoder().encode(loadFixture("price-table.html")).buffer,
      }),
    );

    const { syncPvoilDate } = await import(
      "../../../../api/_lib/fuel-price/sync-service"
    );
    const result = await syncPvoilDate("01/10/2026 15:00:00");
    expect(result.status).toBe("synced");
    expect(updateOne).toHaveBeenCalledTimes(1);
  });
});

describe("pvoil-client fetch errors", () => {
  const prevOrigin = process.env.PVOIL_ORIGIN_IP;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    // Force DNS/fetch path so unit tests can stub global fetch.
    process.env.PVOIL_ORIGIN_IP = "off";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevOrigin === undefined) delete process.env.PVOIL_ORIGIN_IP;
    else process.env.PVOIL_ORIGIN_IP = prevOrigin;
  });

  it("maps HTTP errors to PVOIL_FETCH_FAILED after retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { discoverAvailableDates } = await import(
      "../../../../api/_lib/fuel-price/pvoil-client"
    );
    await expect(discoverAvailableDates()).rejects.toMatchObject({
      code: "PVOIL_FETCH_FAILED",
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("maps abort to PVOIL_TIMEOUT after retries", async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchPriceView } = await import(
      "../../../../api/_lib/fuel-price/pvoil-client"
    );
    await expect(fetchPriceView("01/10/2026 15:00:00")).rejects.toMatchObject({
      code: "PVOIL_TIMEOUT",
    });
  });
});

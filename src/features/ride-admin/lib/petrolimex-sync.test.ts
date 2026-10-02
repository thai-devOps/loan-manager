import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindOne = vi.fn();
const mockFind = vi.fn();
const mockUpdateOne = vi.fn();
const mockCountDocuments = vi.fn();

vi.mock("../../../../api/_lib/mongo", () => ({
  fuelPriceSnapshotsCol: async () => ({
    findOne: mockFindOne,
    find: mockFind,
    updateOne: mockUpdateOne,
    countDocuments: mockCountDocuments,
  }),
}));

const mockFetch = vi.fn();

vi.mock(
  "../../../../api/_lib/fuel-price/sources/petrolimex/petrolimex.client",
  () => ({
    fetchPetrolimexFuelPrices: (...args: unknown[]) => mockFetch(...args),
  }),
);

const sampleProducts = [
  {
    code: "E10_RON95_III",
    name: "Xăng E10 RON 95 Mức 3",
    price: 27180,
    change: null,
    unit: "VND/L" as const,
    grade: "MUC_3",
    region1Price: 27180,
    region2Price: 27720,
  },
  {
    code: "E10_RON95_V",
    name: "Xăng E10 RON 95 Mức 5",
    price: 28180,
    change: null,
    unit: "VND/L" as const,
    grade: "MUC_5",
    region1Price: 28180,
    region2Price: 28740,
  },
  {
    code: "E5_RON92_II",
    name: "Xăng E5 RON 92 Mức 2",
    price: 26560,
    change: null,
    unit: "VND/L" as const,
    grade: "MUC_2",
    region1Price: 26560,
    region2Price: 27090,
  },
  {
    code: "DO_0001S_V",
    name: "DO 0,001S Mức 5",
    price: 31110,
    change: null,
    unit: "VND/L" as const,
    grade: "DO_0001S_MUC_5",
    region1Price: 31110,
    region2Price: 31730,
  },
  {
    code: "DO_005S_II",
    name: "DO 0,05S Mức 2",
    price: 29710,
    change: null,
    unit: "VND/L" as const,
    grade: "DO_005S_MUC_2",
    region1Price: 29710,
    region2Price: 30300,
  },
  {
    code: "KEROSENE",
    name: "Dầu hỏa 2-K",
    price: 29770,
    change: null,
    unit: "VND/L" as const,
    grade: "2K",
    region1Price: 29770,
    region2Price: 30360,
  },
];

describe("syncLatestFuelPrice (PETROLIMEX)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFindOne.mockReset();
    mockFind.mockReset();
    mockUpdateOne.mockReset();
    mockCountDocuments.mockReset();
    mockFetch.mockReset();
    process.env.FUEL_PRICE_PROVIDER = "PETROLIMEX";
    process.env.FUEL_SYNC_ENABLED = "true";
    process.env.FUEL_PRICE_REGION = "REGION_1";
  });

  afterEach(() => {
    delete process.env.FUEL_PRICE_PROVIDER;
    delete process.env.FUEL_SYNC_ENABLED;
    delete process.env.FUEL_PRICE_REGION;
  });

  it("returns already_synced when rawHash matches latest", async () => {
    const { computeFuelPriceRawHash } = await import(
      "../../../../api/_lib/fuel-price/hash"
    );
    const rawHash = computeFuelPriceRawHash({
      provider: "PETROLIMEX",
      effectiveAt: "2026-10-01T08:00:00.000Z",
      products: sampleProducts,
    });

    mockFetch.mockResolvedValueOnce({
      products: sampleProducts,
      effectiveAt: "2026-10-01T08:00:00.000Z",
      effectiveDateRaw: "01/10/2026 15:00:00",
      effectiveTimeSource: "SOURCE",
      sourceUrl: "https://www.petrolimex.com.vn/index.html",
      warnings: [],
    });

    mockFind.mockReturnValue({
      sort: () => ({
        limit: () => ({
          toArray: async () => [
            {
              id: "snap-1",
              source: "PETROLIMEX",
              effectiveAt: "2026-10-01T08:00:00.000Z",
              effectiveDateRaw: "01/10/2026 15:00:00",
              products: sampleProducts,
              sourceUrl: "https://www.petrolimex.com.vn/index.html",
              crawledAt: "2026-10-01T09:00:00.000Z",
              createdAt: "2026-10-01T09:00:00.000Z",
              updatedAt: "2026-10-01T09:00:00.000Z",
              rawHash,
              status: "SUCCESS",
            },
          ],
        }),
      }),
    });
    mockUpdateOne.mockResolvedValue({});

    const { syncLatestFuelPrice } = await import(
      "../../../../api/_lib/fuel-price/sync-service"
    );
    const result = await syncLatestFuelPrice({ trigger: "CRON" });
    expect(result.success).toBe(true);
    expect(result.status).toBe("already_synced");
    expect(result.changed).toBe(false);
    expect(result.source).toBe("PETROLIMEX");
  });

  it("does not overwrite on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error("blocked"), {
        name: "FuelSourceError",
        code: "FUEL_SOURCE_BLOCKED",
      }),
    );

    // Import FuelSourceError properly via throwing from mock
    const { FuelSourceError } = await import(
      "../../../../api/_lib/fuel-price/sources/petrolimex/petrolimex.types"
    );
    mockFetch.mockReset();
    mockFetch.mockRejectedValueOnce(
      new FuelSourceError("FUEL_SOURCE_BLOCKED", "403", 403),
    );

    const { syncLatestFuelPrice } = await import(
      "../../../../api/_lib/fuel-price/sync-service"
    );
    await expect(
      syncLatestFuelPrice({ trigger: "ADMIN" }),
    ).rejects.toMatchObject({ code: "FUEL_SOURCE_BLOCKED" });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});

describe("getFuelPriceForDate uses active provider", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFind.mockReset();
    process.env.FUEL_PRICE_PROVIDER = "PETROLIMEX";
  });

  afterEach(() => {
    delete process.env.FUEL_PRICE_PROVIDER;
  });

  it("queries PETROLIMEX snapshots", async () => {
    mockFind.mockReturnValue({
      sort: () => ({
        limit: () => ({
          toArray: async () => [
            {
              source: "PETROLIMEX",
              effectiveAt: "2026-09-15T08:00:00.000Z",
              products: [
                {
                  code: "E10_RON95_III",
                  name: "E10",
                  price: 27_180,
                  change: null,
                  unit: "VND/L",
                },
              ],
              status: "SUCCESS",
            },
          ],
        }),
      }),
    });

    const { getFuelPriceForDate } = await import(
      "../../../../api/_lib/fuel-price/sync-service"
    );
    const price = await getFuelPriceForDate(
      "E10_RON95_III",
      "2026-09-20T10:00:00.000Z",
    );
    expect(price).toMatchObject({
      fuelPrice: 27_180,
      fuelPriceSource: "PETROLIMEX",
    });
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ source: "PETROLIMEX" }),
    );
  });
});

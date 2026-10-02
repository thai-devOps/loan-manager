import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const find = vi.fn();
const toArray = vi.fn();

vi.mock("../../../../api/_lib/mongo", () => ({
  fuelPriceSnapshotsCol: async () => ({
    find: (...args: unknown[]) => {
      find(...args);
      return {
        sort: () => ({
          limit: () => ({
            toArray,
          }),
        }),
      };
    },
  }),
}));

describe("getFuelPriceForDate (cases 5–6)", () => {
  beforeEach(() => {
    vi.resetModules();
    find.mockReset();
    toArray.mockReset();
    process.env.FUEL_PRICE_PROVIDER = "PETROLIMEX";
  });

  afterEach(() => {
    delete process.env.FUEL_PRICE_PROVIDER;
  });

  it("5: picks latest snapshot with effectiveAt <= departureAt", async () => {
    toArray.mockResolvedValue([
      {
        source: "PETROLIMEX",
        effectiveAt: "2026-09-15T08:00:00.000Z",
        products: [
          {
            code: "E10_RON95_III",
            name: "E10",
            price: 22_500,
            change: 0,
            unit: "VND/L",
          },
        ],
        status: "SUCCESS",
      },
    ]);

    const { getFuelPriceForDate } = await import(
      "../../../../api/_lib/fuel-price/sync-service"
    );
    const price = await getFuelPriceForDate(
      "E10_RON95_III",
      "2026-09-20T10:00:00.000Z",
    );
    expect(price).toMatchObject({
      fuelType: "E10_RON95_III",
      fuelPrice: 22_500,
      fuelPriceSource: "PETROLIMEX",
      fuelPriceEffectiveAt: "2026-09-15T08:00:00.000Z",
    });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "PETROLIMEX",
        effectiveAt: { $lte: "2026-09-20T10:00:00.000Z" },
      }),
    );
  });

  it("6: returns null when product missing (no HTTP crawl)", async () => {
    toArray.mockResolvedValue([
      {
        source: "PETROLIMEX",
        effectiveAt: "2026-09-15T08:00:00.000Z",
        products: [
          {
            code: "E5_RON92_II",
            name: "E5",
            price: 21_000,
            change: 0,
            unit: "VND/L",
          },
        ],
      },
    ]);

    const { getFuelPriceForDate } = await import(
      "../../../../api/_lib/fuel-price/sync-service"
    );
    const price = await getFuelPriceForDate(
      "E10_RON95_III",
      "2026-09-20T10:00:00.000Z",
    );
    expect(price).toBeNull();
  });

  it("returns null for empty history", async () => {
    toArray.mockResolvedValue([]);
    const { getFuelPriceForDate } = await import(
      "../../../../api/_lib/fuel-price/sync-service"
    );
    expect(
      await getFuelPriceForDate("E10_RON95_III", "2026-01-01T00:00:00.000Z"),
    ).toBeNull();
  });
});

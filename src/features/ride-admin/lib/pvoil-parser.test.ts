import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FuelPriceError } from "../../../../api/_lib/fuel-price/errors";
import {
  parsePvoilAvailableDates,
  parsePvoilFuelPriceHtml,
} from "../../../../api/_lib/fuel-price/parser";
import { validateFuelProducts } from "../../../../api/_lib/fuel-price/validate";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/pvoil",
);

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

describe("parsePvoilAvailableDates", () => {
  it("parses and sorts dates descending by effectiveAt", () => {
    const dates = parsePvoilAvailableDates(loadFixture("page-with-dates.html"));
    expect(dates).toHaveLength(3);
    expect(dates[0]!.rawDate).toBe("01/10/2026 15:00:00");
    expect(dates[1]!.rawDate).toBe("30/09/2026 15:00:00");
    expect(dates[2]!.rawDate).toBe("25/09/2026 15:00:00");
    expect(dates[0]!.effectiveAt > dates[1]!.effectiveAt).toBe(true);
  });

  it("throws when ddlpricedate missing", () => {
    expect(() => parsePvoilAvailableDates("<html><body></body></html>")).toThrow(
      FuelPriceError,
    );
    try {
      parsePvoilAvailableDates("<html><body></body></html>");
    } catch (e) {
      expect(e).toBeInstanceOf(FuelPriceError);
      expect((e as FuelPriceError).code).toBe("PVOIL_NO_AVAILABLE_DATES");
    }
  });
});

describe("parsePvoilFuelPriceHtml", () => {
  it("parses prices, changes, and required codes", () => {
    const products = parsePvoilFuelPriceHtml(
      loadFixture("price-table.html"),
      "2026-10-01T08:00:00.000Z",
    );
    expect(products.find((p) => p.code === "E10_RON95_III")?.price).toBe(
      27_180,
    );
    expect(products.find((p) => p.code === "E10_RON95_III")?.change).toBe(100);
    expect(products.find((p) => p.code === "E5_RON92_II")?.change).toBe(170);
    expect(products.find((p) => p.code === "DO_005S_II")?.price).toBe(29_710);
    expect(products.find((p) => p.code === "DO_0001S_V")?.price).toBe(31_110);
    expect(products.find((p) => p.code === "DO_005S_II")?.change).toBe(-780);

    expect(() =>
      validateFuelProducts(products, "2026-10-01T08:00:00.000Z"),
    ).not.toThrow();
  });

  it("throws when table missing", () => {
    try {
      parsePvoilFuelPriceHtml("<div>no table</div>", "2026-10-01T08:00:00.000Z");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(FuelPriceError);
      expect((e as FuelPriceError).code).toBe("PVOIL_PARSE_FAILED");
    }
  });

  it("fails validation when a required product is missing", () => {
    const products = parsePvoilFuelPriceHtml(
      loadFixture("price-table-missing-required.html"),
      "2026-10-01T08:00:00.000Z",
    );
    expect(() =>
      validateFuelProducts(products, "2026-10-01T08:00:00.000Z"),
    ).toThrow(FuelPriceError);
  });
});

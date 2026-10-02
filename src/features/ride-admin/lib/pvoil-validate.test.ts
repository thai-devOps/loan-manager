import { describe, expect, it } from "vitest";
import { FuelPriceError } from "../../../../api/_lib/fuel-price/errors";
import type { FuelPriceProduct } from "../../../../api/_lib/fuel-price/types";
import { validateFuelProducts } from "../../../../api/_lib/fuel-price/validate";

function product(
  partial: Partial<FuelPriceProduct> & Pick<FuelPriceProduct, "code" | "name">,
): FuelPriceProduct {
  return {
    price: 20_000,
    change: 0,
    unit: "VND/L",
    ...partial,
  };
}

const validSet: FuelPriceProduct[] = [
  product({ code: "E10_RON95_III", name: "E10 RON 95", price: 22_330, change: 100 }),
  product({ code: "E5_RON92_II", name: "E5 RON 92", price: 21_180, change: -50 }),
  product({ code: "DO_005S_II", name: "DO 0.05S", price: 19_450 }),
  product({ code: "DO_0001S_V", name: "DO 0.001S", price: 19_870 }),
];

describe("validateFuelProducts", () => {
  it("accepts a complete valid set", () => {
    expect(() =>
      validateFuelProducts(validSet, "2026-10-01T08:00:00.000Z"),
    ).not.toThrow();
  });

  it("rejects invalid price", () => {
    const bad = [
      ...validSet.slice(0, 3),
      product({ code: "DO_0001S_V", name: "DO", price: 0 }),
    ];
    expect(() =>
      validateFuelProducts(bad, "2026-10-01T08:00:00.000Z"),
    ).toThrow(FuelPriceError);
  });

  it("rejects duplicate codes", () => {
    const bad = [
      ...validSet,
      product({ code: "E10_RON95_III", name: "dup", price: 22_000 }),
    ];
    expect(() =>
      validateFuelProducts(bad, "2026-10-01T08:00:00.000Z"),
    ).toThrow(/Trùng mã/);
  });

  it("rejects missing required product", () => {
    expect(() =>
      validateFuelProducts(validSet.slice(0, 3), "2026-10-01T08:00:00.000Z"),
    ).toThrow(/Thiếu sản phẩm/);
  });
});

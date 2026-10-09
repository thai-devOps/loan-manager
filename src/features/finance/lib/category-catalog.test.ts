import { describe, expect, it } from "vitest";
import { DEFAULT_FINANCE_CATEGORIES as seedRows } from "../../../../shared/finance/default-categories.mjs";
import {
  CATEGORY_COLORS,
  DEFAULT_FINANCE_CATEGORIES,
  decideCategoryDelete,
  isAllowedCategoryIcon,
  isHexColor,
  normalizeCategoryName,
} from "@shared/finance/category-catalog";
import { parseCategoryInput } from "../../../../api/_lib/finance-categories";

describe("finance category catalog", () => {
  it("treats names that differ only by case as the same", () => {
    expect(normalizeCategoryName("  Ăn   Uống ")).toBe(
      normalizeCategoryName("ăn uống"),
    );
  });

  it("rejects unknown icons and bad hex colors", () => {
    expect(isAllowedCategoryIcon("NotAnIcon")).toBe(false);
    expect(isHexColor("#xyzxyz")).toBe(false);
    expect(isHexColor(CATEGORY_COLORS[0])).toBe(true);
    expect(() =>
      parseCategoryInput({
        name: "Cafe",
        type: "expense",
        icon: "Nope",
        color: "#112233",
      }),
    ).toThrow(/Biểu tượng/);
    expect(() =>
      parseCategoryInput({
        name: "Cafe",
        type: "expense",
        icon: "Coffee",
        color: "red",
      }),
    ).toThrow(/Màu/);
  });

  it("deactivates a category that already has transactions", () => {
    expect(decideCategoryDelete(2)).toBe("deactivate");
    expect(decideCategoryDelete(0)).toBe("delete");
  });

  it("keeps the seed list aligned with the catalog", () => {
    expect(seedRows).toEqual(DEFAULT_FINANCE_CATEGORIES);
  });
});

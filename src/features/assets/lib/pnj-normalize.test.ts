import { describe, expect, it } from "vitest";
import {
  isSameGoldSnapshotContent,
  normalizePnjResponse,
  parsePnjRawPrice,
  parsePnjUpdateDate,
  validatePnjResponse,
} from "../../../../api/_lib/gold-price/normalize";

describe("parsePnjRawPrice", () => {
  it("scales number and string by 1000", () => {
    expect(parsePnjRawPrice(14250)).toBe(14_250_000);
    expect(parsePnjRawPrice("14250")).toBe(14_250_000);
    expect(parsePnjRawPrice(14550)).toBe(14_550_000);
  });

  it("maps empty string to null (not 0)", () => {
    expect(parsePnjRawPrice("")).toBeNull();
    expect(parsePnjRawPrice("   ")).toBeNull();
    expect(parsePnjRawPrice(null)).toBeNull();
    expect(parsePnjRawPrice(undefined)).toBeNull();
  });
});

describe("normalizePnjResponse", () => {
  it("normalizes SJC and empty sell for RAW_9999", () => {
    const raw = validatePnjResponse({
      data: [
        {
          masp: "SJC",
          tensp: "Vàng miếng SJC 999.9",
          giaban: 14550,
          giamua: 14250,
        },
        {
          masp: "RAW_9999",
          tensp: "Nguyên liệu vàng PNJ 999.9",
          giaban: "",
          giamua: 13580,
        },
      ],
      chinhanh: "hochiminh",
      updateDate: "22/09/2026 13:17:45",
    });
    const result = normalizePnjResponse(raw, "00", "2026-09-22T06:17:45.000Z");
    expect(result.branch).toBe("hochiminh");
    expect(result.sourceUpdatedAt).toBe(
      parsePnjUpdateDate("22/09/2026 13:17:45"),
    );
    const sjc = result.prices.find((p) => p.sourceCode === "SJC")!;
    expect(sjc.buyPricePerChi).toBe(14_250_000);
    expect(sjc.sellPricePerChi).toBe(14_550_000);
    const raw9999 = result.prices.find((p) => p.sourceCode === "RAW_9999")!;
    expect(raw9999.buyPricePerChi).toBe(13_580_000);
    expect(raw9999.sellPricePerChi).toBeNull();
  });
});

describe("isSameGoldSnapshotContent", () => {
  const base = {
    sourceUpdatedAt: "2026-09-22T06:17:45.000Z",
    prices: [
      {
        sourceCode: "SJC",
        buyPricePerChi: 14_250_000,
        sellPricePerChi: 14_550_000,
      },
      {
        sourceCode: "N24K",
        buyPricePerChi: 14_200_000,
        sellPricePerChi: 14_500_000,
      },
    ],
  };

  it("returns true for identical content (case-insensitive code)", () => {
    expect(
      isSameGoldSnapshotContent(base, {
        sourceUpdatedAt: base.sourceUpdatedAt,
        prices: [
          {
            sourceCode: "n24k",
            buyPricePerChi: 14_200_000,
            sellPricePerChi: 14_500_000,
          },
          {
            sourceCode: "sjc",
            buyPricePerChi: 14_250_000,
            sellPricePerChi: 14_550_000,
          },
        ],
      }),
    ).toBe(true);
  });

  it("returns false when one buy price changes", () => {
    expect(
      isSameGoldSnapshotContent(base, {
        ...base,
        prices: [
          base.prices[0]!,
          {
            ...base.prices[1]!,
            buyPricePerChi: 14_210_000,
          },
        ],
      }),
    ).toBe(false);
  });

  it("returns false when sourceUpdatedAt differs", () => {
    expect(
      isSameGoldSnapshotContent(base, {
        ...base,
        sourceUpdatedAt: "2026-09-22T07:00:00.000Z",
      }),
    ).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseVndPrice } from "../../../../api/_lib/fuel-price/normalize";
import { computeFuelPriceRawHash } from "../../../../api/_lib/fuel-price/hash";
import { mapPetrolimexProductName } from "../../../../api/_lib/fuel-price/sources/petrolimex/petrolimex.map";
import {
  parsePetrolimexEffectiveAt,
  parsePetrolimexFuelPriceHtml,
} from "../../../../api/_lib/fuel-price/sources/petrolimex/petrolimex.parser";
import { FuelSourceError } from "../../../../api/_lib/fuel-price/sources/petrolimex/petrolimex.types";
import { computeStale } from "../../../../api/_lib/fuel-price/config";
import { petrolimexEffectiveFromLastModified } from "../../../../api/_lib/fuel-price/sources/petrolimex/petrolimex.client";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/petrolimex",
);

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

describe("parseVndPrice (Petrolimex)", () => {
  it("parses Vietnamese thousands separators", () => {
    expect(parseVndPrice("28.180")).toBe(28180);
    expect(parseVndPrice("28.740")).toBe(28740);
    expect(parseVndPrice("31.110")).toBe(31110);
    expect(parseVndPrice("29.710")).toBe(29710);
  });
});

describe("mapPetrolimexProductName", () => {
  it("maps grades to PE codes", () => {
    expect(mapPetrolimexProductName("Xăng E10 RON 95 Mức 3")).toMatchObject({
      code: "E10_RON95_III",
      grade: "MUC_3",
    });
    expect(mapPetrolimexProductName("Xăng E10 RON 95 Mức 5")).toMatchObject({
      code: "E10_RON95_V",
      grade: "MUC_5",
    });
    expect(mapPetrolimexProductName("Xăng E5 RON 92 Mức 2").code).toBe(
      "E5_RON92_II",
    );
    expect(mapPetrolimexProductName("DO 0,05S Mức 2").code).toBe("DO_005S_II");
    expect(mapPetrolimexProductName("DO 0,001S Mức 5").code).toBe(
      "DO_0001S_V",
    );
    expect(mapPetrolimexProductName("Dầu hỏa 2-K").code).toBe("KEROSENE");
  });
});

describe("parsePetrolimexEffectiveAt", () => {
  it("parses footer timestamp as +07:00", () => {
    const { effectiveAt, effectiveDateRaw } = parsePetrolimexEffectiveAt(
      "Giá của Petrolimex cập nhật lúc 15:00 - 1/10/2026",
    );
    expect(effectiveDateRaw).toBe("01/10/2026 15:00:00");
    expect(effectiveAt).toBe(
      new Date("2026-10-01T15:00:00+07:00").toISOString(),
    );
  });
});

describe("parsePetrolimexFuelPriceHtml", () => {
  it("parses 6 products and both regions (REGION_1 default price)", () => {
    const parsed = parsePetrolimexFuelPriceHtml(
      loadFixture("homepage-snippet.html"),
      "https://www.petrolimex.com.vn/index.html",
      {
        region: "REGION_1",
        crawlStartedAt: "2026-10-02T00:00:00.000Z",
      },
    );
    expect(parsed.products).toHaveLength(6);
    expect(parsed.effectiveTimeSource).toBe("SOURCE");
    expect(parsed.effectiveAt).toBe(
      new Date("2026-10-01T15:00:00+07:00").toISOString(),
    );

    const e10iii = parsed.products.find((p) => p.code === "E10_RON95_III");
    expect(e10iii).toMatchObject({
      price: 27180,
      region1Price: 27180,
      region2Price: 27720,
    });

    const e10v = parsed.products.find((p) => p.code === "E10_RON95_V");
    expect(e10v).toMatchObject({
      price: 28180,
      region1Price: 28180,
      region2Price: 28740,
    });

    const diesel = parsed.products.find((p) => p.code === "DO_005S_II");
    expect(diesel?.price).toBe(29710);
  });

  it("uses REGION_2 prices when configured", () => {
    const parsed = parsePetrolimexFuelPriceHtml(
      loadFixture("homepage-snippet.html"),
      "https://www.petrolimex.com.vn/index.html",
      {
        region: "REGION_2",
        crawlStartedAt: "2026-10-02T00:00:00.000Z",
      },
    );
    expect(
      parsed.products.find((p) => p.code === "E10_RON95_V")?.price,
    ).toBe(28740);
  });

  it("falls back to crawl time when footer missing", () => {
    const html = loadFixture("homepage-snippet.html").replace(
      /Giá của Petrolimex cập nhật lúc[\s\S]*?<\/p>/,
      "<p class=\"f-info\">*đơn vị: VND</p>",
    );
    const crawlStartedAt = "2026-10-02T05:00:00.000Z";
    const parsed = parsePetrolimexFuelPriceHtml(
      html,
      "https://www.petrolimex.com.vn/index.html",
      { region: "REGION_1", crawlStartedAt },
    );
    expect(parsed.effectiveTimeSource).toBe("CRAWL_TIME");
    expect(parsed.effectiveAt).toBe(crawlStartedAt);
  });

  it("throws when price block missing", () => {
    expect(() =>
      parsePetrolimexFuelPriceHtml(
        "<html><body>no prices</body></html>",
        "https://www.petrolimex.com.vn/index.html",
        {
          region: "REGION_1",
          crawlStartedAt: "2026-10-02T00:00:00.000Z",
        },
      ),
    ).toThrow(FuelSourceError);
  });
});

describe("computeFuelPriceRawHash", () => {
  it("is stable for same payload and changes when price changes", () => {
    const base = {
      provider: "PETROLIMEX" as const,
      effectiveAt: "2026-10-01T08:00:00.000Z",
      products: [
        {
          code: "E10_RON95_III",
          name: "E10 Mức 3",
          price: 27180,
          change: null,
          unit: "VND/L" as const,
          region1Price: 27180,
          region2Price: 27720,
        },
      ],
    };
    const a = computeFuelPriceRawHash(base);
    const b = computeFuelPriceRawHash(base);
    expect(a).toBe(b);
    const c = computeFuelPriceRawHash({
      ...base,
      products: [
        {
          ...base.products[0]!,
          price: 28000,
          region1Price: 28000,
        },
      ],
    });
    expect(c).not.toBe(a);
  });
});

describe("computeStale", () => {
  it("flags stale after threshold hours", () => {
    const old = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    expect(computeStale(old).isStale).toBe(true);
    expect(computeStale(new Date().toISOString()).isStale).toBe(false);
  });
});

describe("petrolimexEffectiveFromLastModified", () => {
  it("rounds CMS LastModified to Petrolimex display slot (+07)", () => {
    // 2026-10-01T08:01:56Z = 15:01 VN → rounds to 15:00
    const parsed = petrolimexEffectiveFromLastModified(
      "2026-10-01T08:01:56.15Z",
    );
    expect(parsed?.effectiveDateRaw).toBe("01/10/2026 15:00:00");
    expect(parsed?.effectiveAt).toBe(
      new Date("2026-10-01T15:00:00+07:00").toISOString(),
    );
  });
});

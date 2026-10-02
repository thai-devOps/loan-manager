import { describe, expect, it } from "vitest";
import {
  formatPvoilDisplayDate,
  normalizeFuelProductName,
  parsePriceChange,
  parsePvoilEffectiveDate,
  parseVndPrice,
} from "../../../../api/_lib/fuel-price/normalize";

describe("normalizeFuelProductName", () => {
  it("maps the 4 required product names", () => {
    expect(normalizeFuelProductName("Xăng E10 RON 95-III").code).toBe(
      "E10_RON95_III",
    );
    expect(normalizeFuelProductName("Xăng E5 RON 92-II").code).toBe(
      "E5_RON92_II",
    );
    expect(normalizeFuelProductName("Dầu DO 0,05S-II").code).toBe("DO_005S_II");
    expect(normalizeFuelProductName("Dầu DO 0,001S-V").code).toBe(
      "DO_0001S_V",
    );
  });

  it("marks unknown products", () => {
    const r = normalizeFuelProductName("Dầu hỏa");
    expect(r.code).toBe("UNKNOWN");
    expect(r.unknown).toBe(true);
  });
});

describe("parseVndPrice", () => {
  it("parses dotted VND displays", () => {
    expect(parseVndPrice("22.330 đ")).toBe(22_330);
    expect(parseVndPrice("27.180 VNĐ")).toBe(27_180);
  });

  it("rejects non-integers / empty", () => {
    expect(parseVndPrice("")).toBeNull();
    expect(parseVndPrice("abc")).toBeNull();
  });
});

describe("parsePriceChange", () => {
  it("parses signed integers", () => {
    expect(parsePriceChange("+100")).toBe(100);
    expect(parsePriceChange("-1330")).toBe(-1330);
    expect(parsePriceChange("0")).toBe(0);
  });

  it("maps dash placeholders to null", () => {
    expect(parsePriceChange("—")).toBeNull();
    expect(parsePriceChange("-")).toBeNull();
  });
});

describe("parsePvoilEffectiveDate", () => {
  it("parses DD/MM/YYYY HH:mm:ss as +07:00 → UTC ISO", () => {
    expect(parsePvoilEffectiveDate("01/10/2026 15:00:00")).toBe(
      "2026-10-01T08:00:00.000Z",
    );
  });

  it("rejects invalid formats", () => {
    expect(parsePvoilEffectiveDate("2026-10-01")).toBeNull();
    expect(parsePvoilEffectiveDate("")).toBeNull();
  });
});

describe("formatPvoilDisplayDate", () => {
  it("formats display date", () => {
    expect(formatPvoilDisplayDate("1/10/2026 15:00:00")).toBe("01-10-2026");
  });
});

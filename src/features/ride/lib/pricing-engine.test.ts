import { describe, expect, it } from "vitest";
import {
  calculateCustomerPrice,
  isRuleEffectiveOn,
  matchTier,
  normalizeLocationKey,
  seatsToVehicleCategory,
  validatePricingConfig,
  type PricingRuleLike,
} from "@shared/ride/pricing-engine";

function rule(partial: Partial<PricingRuleLike> & { id: string }): PricingRuleLike {
  return {
    name: partial.name ?? partial.id,
    type: partial.type ?? "PER_KM",
    serviceType: partial.serviceType ?? "ANY",
    vehicleCategory: partial.vehicleCategory ?? "ANY",
    originKey: partial.originKey,
    destinationKey: partial.destinationKey,
    pricingConfig: partial.pricingConfig ?? {
      basePrice: 200_000,
      pricePerKm: 12_000,
    },
    priority: partial.priority ?? 0,
    status: partial.status ?? "ACTIVE",
    effectiveFrom: partial.effectiveFrom ?? "2020-01-01",
    effectiveTo: partial.effectiveTo ?? null,
    version: partial.version ?? 1,
    ...partial,
  };
}

describe("pricing-engine", () => {
  it("normalizes location keys", () => {
    expect(normalizeLocationKey("  Long   Xuyên ")).toBe("long xuyen");
  });

  it("maps seats to vehicle category", () => {
    expect(seatsToVehicleCategory(4)).toBe("SEAT_4");
    expect(seatsToVehicleCategory(7)).toBe("SEAT_7");
    expect(seatsToVehicleCategory(16)).toBe("SEAT_16");
  });

  it("matches exact route + vehicle + service", () => {
    const rules = [
      rule({
        id: "route",
        type: "ROUTE",
        serviceType: "TRAVEL",
        vehicleCategory: "SEAT_7",
        originKey: "long xuyen",
        destinationKey: "can tho",
        priority: 10,
        pricingConfig: { basePrice: 200_000, pricePerKm: 12_000 },
      }),
      rule({
        id: "generic",
        type: "PER_KM",
        priority: 0,
        pricingConfig: { basePrice: 100_000, pricePerKm: 10_000 },
      }),
    ];
    const result = calculateCustomerPrice(rules, {
      serviceType: "TRAVEL",
      vehicleCategory: "SEAT_7",
      originKey: "long xuyen",
      destinationKey: "can tho",
      distanceKm: 147.58,
      roundTrip: true,
      date: "2026-09-18",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.matchedRuleId).toBe("route");
      expect(result.billableKm).toBeCloseTo(295.16, 1);
      expect(result.breakdown.basePrice).toBe(200_000);
      expect(result.breakdown.distancePrice).toBe(Math.round(295.16 * 12_000));
      expect(result.breakdown.total).toBe(
        200_000 + Math.round(295.16 * 12_000),
      );
    }
  });

  it("falls back to vehicle + service then generic per-km", () => {
    const rules = [
      rule({
        id: "veh",
        type: "PER_KM",
        serviceType: "TRAVEL",
        vehicleCategory: "SEAT_7",
        pricingConfig: { basePrice: 150_000, pricePerKm: 11_000 },
      }),
      rule({
        id: "generic",
        type: "PER_KM",
        pricingConfig: { basePrice: 100_000, pricePerKm: 10_000 },
      }),
    ];
    const hit = calculateCustomerPrice(rules, {
      serviceType: "TRAVEL",
      vehicleCategory: "SEAT_7",
      distanceKm: 10,
      roundTrip: false,
      date: "2026-09-18",
    });
    expect(hit.ok && hit.matchedRuleId).toBe("veh");

    const generic = calculateCustomerPrice(rules, {
      serviceType: "MEDICAL",
      vehicleCategory: "SEAT_4",
      distanceKm: 10,
      roundTrip: false,
      date: "2026-09-18",
    });
    expect(generic.ok && generic.matchedRuleId).toBe("generic");
  });

  it("applies minimum price", () => {
    const result = calculateCustomerPrice(
      [
        rule({
          id: "min",
          pricingConfig: {
            basePrice: 0,
            pricePerKm: 1_000,
            minimumPrice: 500_000,
          },
        }),
      ],
      {
        serviceType: "TRAVEL",
        vehicleCategory: "ANY",
        distanceKm: 10,
        roundTrip: false,
        date: "2026-09-18",
      },
    );
    expect(result.ok && result.breakdown.total).toBe(500_000);
  });

  it("stacks surcharge after fare", () => {
    const result = calculateCustomerPrice(
      [
        rule({
          id: "fare",
          pricingConfig: { basePrice: 200_000, pricePerKm: 0 },
        }),
        rule({
          id: "s1",
          type: "SURCHARGE",
          pricingConfig: {
            surchargeType: "fixed",
            surchargeAmount: 50_000,
          },
        }),
      ],
      {
        serviceType: "TRAVEL",
        vehicleCategory: "ANY",
        distanceKm: 0,
        roundTrip: false,
        date: "2026-09-18",
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.breakdown.surcharges).toBe(50_000);
      expect(result.breakdown.total).toBe(250_000);
    }
  });

  it("ignores draft, archived, expired rules", () => {
    const rules = [
      rule({ id: "draft", status: "DRAFT" }),
      rule({ id: "arch", status: "ARCHIVED" }),
      rule({
        id: "expired",
        effectiveFrom: "2020-01-01",
        effectiveTo: "2020-12-31",
      }),
    ];
    const result = calculateCustomerPrice(rules, {
      serviceType: "TRAVEL",
      vehicleCategory: "ANY",
      distanceKm: 10,
      roundTrip: false,
      date: "2026-09-18",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NO_PRICING_RULE_FOUND");
  });

  it("respects effective date window", () => {
    const r = rule({
      id: "win",
      effectiveFrom: "2026-09-01",
      effectiveTo: "2026-09-30",
    });
    expect(isRuleEffectiveOn(r, "2026-09-18")).toBe(true);
    expect(isRuleEffectiveOn(r, "2026-10-01")).toBe(false);
  });

  it("uses higher priority within same tier", () => {
    const rules = [
      rule({
        id: "low",
        priority: 1,
        pricingConfig: { basePrice: 100_000, pricePerKm: 0 },
      }),
      rule({
        id: "high",
        priority: 5,
        pricingConfig: { basePrice: 300_000, pricePerKm: 0 },
      }),
    ];
    const result = calculateCustomerPrice(rules, {
      serviceType: "TRAVEL",
      vehicleCategory: "ANY",
      distanceKm: 0,
      roundTrip: false,
      date: "2026-09-18",
    });
    expect(result.ok && result.matchedRuleId).toBe("high");
  });

  it("returns NO_PRICING_RULE_FOUND when empty", () => {
    const result = calculateCustomerPrice([], {
      serviceType: "TRAVEL",
      vehicleCategory: "SEAT_7",
      distanceKm: 10,
      roundTrip: false,
      date: "2026-09-18",
    });
    expect(result.ok).toBe(false);
  });

  it("keeps customer total free of operating costs", () => {
    const result = calculateCustomerPrice(
      [
        rule({
          id: "r",
          pricingConfig: { basePrice: 200_000, pricePerKm: 12_000 },
        }),
      ],
      {
        serviceType: "TRAVEL",
        vehicleCategory: "ANY",
        distanceKm: 10,
        roundTrip: false,
        date: "2026-09-18",
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.breakdown.total).toBe(200_000 + 120_000);
      // no fuel/driver fields on customer breakdown
      expect(Object.keys(result.breakdown).sort()).toEqual([
        "basePrice",
        "distancePrice",
        "surcharges",
        "total",
      ]);
    }
  });

  it("validates negative prices", () => {
    expect(
      validatePricingConfig("PER_KM", { basePrice: -1, pricePerKm: 10 }),
    ).toMatch(/Giá cơ bản/);
  });

  it("exposes match tier ordering", () => {
    const exact = rule({
      id: "e",
      type: "ROUTE",
      serviceType: "TRAVEL",
      vehicleCategory: "SEAT_7",
      originKey: "a",
      destinationKey: "b",
    });
    expect(
      matchTier(exact, {
        serviceType: "TRAVEL",
        vehicleCategory: "SEAT_7",
        originKey: "a",
        destinationKey: "b",
        distanceKm: 1,
        roundTrip: false,
        date: "2026-09-18",
      }),
    ).toBe(1);
  });
});

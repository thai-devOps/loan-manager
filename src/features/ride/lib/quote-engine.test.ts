import { describe, expect, it } from "vitest";
import { calculateTripQuote } from "@shared/ride/quote-engine";
import { DEFAULT_VEHICLE_PRICING } from "@shared/ride/vehicle-pricing";

const cfg = DEFAULT_VEHICLE_PRICING;

const fuelOverride = {
  estimatedLiters: 8,
  fuelCost: 8 * 23_000,
  fuelPricePerLiter: 23_000,
  consumptionLPer100Km: 8,
  billableDistanceKm: 100,
  operationalDistanceKm: 100,
  operationalDistanceFactor: 1,
};

describe("calculateTripQuote", () => {
  it("prices ONE_WAY with fare + operating + extras via fuelOverride", () => {
    const q = calculateTripQuote({
      tripType: "ONE_WAY",
      distanceKm: 100,
      durationMinutes: 90,
      pricingConfig: cfg,
      tollFee: 50_000,
      parkingFee: 20_000,
      waitingFee: 10_000,
      fuelOverride,
    });
    expect(q.autoQuote).toBe(true);
    expect(q.billableKm).toBe(100);
    expect(q.fuelLiters).toBe(8);
    expect(q.fuelCost).toBe(8 * 23_000);
    expect(q.driverCost).toBe(2 * 150_000);
    expect(q.fare).toBe(200_000 + 100 * 12_000);
    expect(q.totalPrice).toBe(
      q.fare + q.operatingCost + 50_000 + 20_000 + 10_000,
    );
  });

  it("doubles distance and duration for ROUND_TRIP", () => {
    const q = calculateTripQuote({
      tripType: "ROUND_TRIP",
      distanceKm: 50,
      durationMinutes: 60,
      pricingConfig: cfg,
      fuelOverride: {
        ...fuelOverride,
        billableDistanceKm: 100,
        operationalDistanceKm: 100,
        estimatedLiters: 8,
        fuelCost: 184_000,
      },
    });
    expect(q.billableKm).toBe(100);
    expect(q.durationMinutes).toBe(120);
    expect(q.driverCost).toBe(2 * 150_000);
  });

  it("uses daily formula for DAILY", () => {
    const q = calculateTripQuote({
      tripType: "DAILY",
      distanceKm: 250,
      durationMinutes: 300,
      pricingConfig: cfg,
      tollFee: 100_000,
      fuelOverride: {
        ...fuelOverride,
        billableDistanceKm: 250,
        operationalDistanceKm: 250,
        estimatedLiters: 20,
        fuelCost: 460_000,
      },
    });
    expect(q.autoQuote).toBe(true);
    expect(q.fare).toBe(1_500_000 + 50 * 10_000);
    expect(q.totalPrice).toBe(q.fare + 100_000);
    expect(q.breakdown.some((b) => b.label.includes("tham khảo"))).toBe(true);
  });

  it("does not auto-quote CUSTOM", () => {
    const q = calculateTripQuote({
      tripType: "CUSTOM",
      distanceKm: 10,
      durationMinutes: 20,
      pricingConfig: cfg,
    });
    expect(q.autoQuote).toBe(false);
    expect(q.totalPrice).toBeNull();
  });

  it("uses operational km from fuelOverride separately from billable km", () => {
    const q = calculateTripQuote({
      tripType: "ONE_WAY",
      distanceKm: 100,
      durationMinutes: 60,
      pricingConfig: cfg,
      fuelOverride: {
        ...fuelOverride,
        operationalDistanceKm: 115,
        operationalDistanceFactor: 1.15,
        estimatedLiters: 9.2,
        fuelCost: 184_000,
      },
    });
    expect(q.billableKm).toBe(100);
    expect(q.operationalDistanceKm).toBe(115);
    expect(q.operationalDistanceFactor).toBe(1.15);
    expect(q.fare).toBe(200_000 + 100 * 12_000);
  });
});

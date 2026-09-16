import { describe, expect, it } from "vitest";
import { calculateTripQuote } from "@shared/ride/quote-engine";
import { DEFAULT_VEHICLE_PRICING } from "@shared/ride/vehicle-pricing";

const cfg = DEFAULT_VEHICLE_PRICING;

describe("calculateTripQuote", () => {
  it("prices ONE_WAY with fare + operating + extras", () => {
    const q = calculateTripQuote({
      tripType: "ONE_WAY",
      distanceKm: 100,
      durationMinutes: 90,
      pricingConfig: cfg,
      tollFee: 50_000,
      parkingFee: 20_000,
      waitingFee: 10_000,
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
});

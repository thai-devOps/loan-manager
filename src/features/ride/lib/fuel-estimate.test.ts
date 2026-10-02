import { describe, expect, it } from "vitest";
import {
  buildFuelSnapshot,
  calculateFuelConsumption,
  calculateFuelCost,
  estimateTripFuelCost,
  pickConsumption,
  resolveOperationalDistanceKm,
} from "@shared/ride/fuel-estimate";
import { calculateTripQuote } from "@shared/ride/quote-engine";
import {
  DEFAULT_VEHICLE_PRICING,
  requireVehicleFuelConfig,
  VehicleFuelConfigError,
} from "@shared/ride/vehicle-pricing";

const rates = { city: 10, highway: 7, mixed: 8.5 };

describe("fuel estimate (cases 1–4, 11–13, 19–20)", () => {
  it("1: calculates liters without early rounding", () => {
    const liters = calculateFuelConsumption(123.4, 8.5);
    expect(liters).toBeCloseTo(10.489, 6);
  });

  it("2: rounds fuel cost to integer VND", () => {
    expect(calculateFuelCost(10.489, 23_010)).toBe(Math.round(10.489 * 23_010));
  });

  it("3: applies operational distance factor", () => {
    expect(resolveOperationalDistanceKm(100, 1.15)).toBeCloseTo(115, 10);
  });

  it("4: estimateTripFuelCost uses operational km for liters/cost", () => {
    const est = estimateTripFuelCost({
      vehicleId: "v1",
      fuelType: "E10_RON95_III",
      billableDistanceKm: 100,
      operationalDistanceFactor: 1.1,
      fuelConsumption: rates,
      defaultConsumption: 8.5,
      fuelPrice: 20_000,
      fuelPriceEffectiveAt: "2026-09-01T00:00:00.000Z",
    });
    expect(est.operationalDistanceKm).toBeCloseTo(110, 10);
    expect(est.estimatedLiters).toBeCloseTo(9.35, 6);
    expect(est.estimatedFuelCost).toBe(
      Math.round(est.estimatedLiters * 20_000),
    );
    expect(est.source).toBe("PVOIL");
  });

  it("11: picks city consumption", () => {
    expect(pickConsumption(rates, 8.5, "city").consumptionLPer100Km).toBe(10);
  });

  it("12: picks highway consumption", () => {
    expect(pickConsumption(rates, 8.5, "highway").consumptionLPer100Km).toBe(7);
  });

  it("13: picks mixed / default consumption", () => {
    expect(pickConsumption(rates, 8.5, "mixed").consumptionLPer100Km).toBe(8.5);
    expect(pickConsumption(rates, 9, null).consumptionLPer100Km).toBe(9);
    expect(pickConsumption(rates, 9, undefined).routeCondition).toBe("default");
  });

  it("19: supports multiple PVOIL fuel types in estimate", () => {
    for (const fuelType of [
      "E10_RON95_III",
      "E5_RON92_II",
      "DO_005S_II",
      "DO_0001S_V",
    ] as const) {
      const est = estimateTripFuelCost({
        vehicleId: "v1",
        fuelType,
        billableDistanceKm: 50,
        operationalDistanceFactor: 1,
        fuelConsumption: rates,
        defaultConsumption: 8,
        fuelPrice: 21_000,
        fuelPriceEffectiveAt: "2026-09-01T00:00:00.000Z",
      });
      expect(est.fuelType).toBe(fuelType);
      expect(est.estimatedFuelCost).toBeGreaterThan(0);
    }
  });

  it("20: quote total = fare + fuel + driver + fees with fuelOverride", () => {
    const fuel = estimateTripFuelCost({
      vehicleId: "v1",
      fuelType: "E10_RON95_III",
      billableDistanceKm: 100,
      operationalDistanceFactor: 1,
      fuelConsumption: rates,
      defaultConsumption: 8,
      routeCondition: "mixed",
      fuelPrice: 23_000,
      fuelPriceEffectiveAt: "2026-09-01T00:00:00.000Z",
    });
    const q = calculateTripQuote({
      tripType: "ONE_WAY",
      distanceKm: 100,
      durationMinutes: 90,
      pricingConfig: DEFAULT_VEHICLE_PRICING,
      tollFee: 50_000,
      parkingFee: 20_000,
      waitingFee: 10_000,
      fuelOverride: {
        estimatedLiters: fuel.estimatedLiters,
        fuelCost: fuel.estimatedFuelCost,
        fuelPricePerLiter: fuel.fuelPrice,
        consumptionLPer100Km: fuel.consumptionLPer100Km,
        billableDistanceKm: fuel.billableDistanceKm,
        operationalDistanceKm: fuel.operationalDistanceKm,
        operationalDistanceFactor: fuel.operationalDistanceFactor,
      },
    });
    const fare = 200_000 + 100 * 12_000;
    const driver = 2 * 150_000;
    expect(q.fuelCost).toBe(fuel.estimatedFuelCost);
    expect(q.totalPrice).toBe(
      fare + fuel.estimatedFuelCost + driver + 50_000 + 20_000 + 10_000,
    );
  });
});

describe("fuel estimate validation (cases 7–10)", () => {
  it("7: rejects invalid distance", () => {
    expect(() => resolveOperationalDistanceKm(-1, 1)).toThrow("DISTANCE_INVALID");
    expect(() => resolveOperationalDistanceKm(10, 0.9)).toThrow("DISTANCE_INVALID");
  });

  it("8: rejects invalid fuel price / consumption for cost", () => {
    expect(() => calculateFuelCost(1, 0)).toThrow("FUEL_CONSUMPTION_INVALID");
    expect(() => calculateFuelCost(1, 20_000.5)).toThrow("FUEL_CONSUMPTION_INVALID");
  });

  it("9: requireVehicleFuelConfig throws when missing", () => {
    expect(() => requireVehicleFuelConfig(DEFAULT_VEHICLE_PRICING)).toThrow(
      VehicleFuelConfigError,
    );
    try {
      requireVehicleFuelConfig({});
    } catch (e) {
      expect(e).toMatchObject({ code: "VEHICLE_FUEL_CONFIG_MISSING" });
    }
  });

  it("10: invalid consumption in estimate throws", () => {
    expect(() =>
      estimateTripFuelCost({
        vehicleId: "v1",
        fuelType: "E10_RON95_III",
        billableDistanceKm: 10,
        operationalDistanceFactor: 1,
        fuelConsumption: { city: 0, highway: 0, mixed: 0 },
        defaultConsumption: 0,
        fuelPrice: 20_000,
        fuelPriceEffectiveAt: "2026-09-01T00:00:00.000Z",
      }),
    ).toThrow("FUEL_CONSUMPTION_INVALID");
  });
});

describe("fuel snapshot immutability (cases 14–15)", () => {
  it("14: buildFuelSnapshot copies estimate fields", () => {
    const est = estimateTripFuelCost({
      vehicleId: "v1",
      fuelType: "DO_005S_II",
      billableDistanceKm: 80,
      operationalDistanceFactor: 1.05,
      fuelConsumption: rates,
      defaultConsumption: 8,
      fuelPrice: 19_500,
      fuelPriceEffectiveAt: "2026-08-15T08:00:00.000Z",
    });
    const snap = buildFuelSnapshot(est);
    expect(snap).toEqual(est);
    snap.estimatedFuelCost = 1;
    expect(est.estimatedFuelCost).not.toBe(1);
  });

  it("15: frozen snapshot values do not depend on later price changes", () => {
    const first = estimateTripFuelCost({
      vehicleId: "v1",
      fuelType: "E10_RON95_III",
      billableDistanceKm: 100,
      operationalDistanceFactor: 1,
      fuelConsumption: rates,
      defaultConsumption: 8,
      fuelPrice: 20_000,
      fuelPriceEffectiveAt: "2026-01-01T00:00:00.000Z",
    });
    const frozen = buildFuelSnapshot(first);
    const later = estimateTripFuelCost({
      vehicleId: "v1",
      fuelType: "E10_RON95_III",
      billableDistanceKm: 100,
      operationalDistanceFactor: 1,
      fuelConsumption: rates,
      defaultConsumption: 8,
      fuelPrice: 25_000,
      fuelPriceEffectiveAt: "2026-10-01T00:00:00.000Z",
    });
    expect(frozen.estimatedFuelCost).not.toBe(later.estimatedFuelCost);
    expect(frozen.fuelPrice).toBe(20_000);
  });
});

describe("quote engine ignores client fuel when override used (16–18)", () => {
  const cfg = {
    ...DEFAULT_VEHICLE_PRICING,
    fuelConsumptionPer100Km: 99,
    fuelPricePerLiter: 99_999,
  };

  it("16: fuelOverride wins over vehicle fuelPricePerLiter", () => {
    const q = calculateTripQuote({
      tripType: "ONE_WAY",
      distanceKm: 50,
      durationMinutes: 60,
      pricingConfig: cfg,
      fuelOverride: {
        estimatedLiters: 4,
        fuelCost: 80_000,
        fuelPricePerLiter: 20_000,
        consumptionLPer100Km: 8,
        billableDistanceKm: 50,
        operationalDistanceKm: 50,
        operationalDistanceFactor: 1,
      },
    });
    expect(q.fuelPricePerLiter).toBe(20_000);
    expect(q.fuelCost).toBe(80_000);
    expect(q.fuelLiters).toBe(4);
  });

  it("17: without override, zero defaults yield zero fuel (no silent 23k)", () => {
    const q = calculateTripQuote({
      tripType: "ONE_WAY",
      distanceKm: 50,
      durationMinutes: 60,
      pricingConfig: DEFAULT_VEHICLE_PRICING,
    });
    expect(q.fuelCost).toBe(0);
    expect(q.fuelLiters).toBe(0);
  });

  it("18: markup-like vehicle price fields do not alter override fuel", () => {
    const q = calculateTripQuote({
      tripType: "ONE_WAY",
      distanceKm: 100,
      durationMinutes: 60,
      pricingConfig: { ...cfg, baseFare: 1_000_000, pricePerKm: 50_000 },
      fuelOverride: {
        estimatedLiters: 8,
        fuelCost: 160_000,
        fuelPricePerLiter: 20_000,
        consumptionLPer100Km: 8,
        billableDistanceKm: 100,
        operationalDistanceKm: 100,
        operationalDistanceFactor: 1,
      },
    });
    expect(q.fuelCost).toBe(160_000);
    expect(q.fare).toBe(1_000_000 + 100 * 50_000);
  });
});

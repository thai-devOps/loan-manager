import { describe, expect, it } from "vitest";
import { calculatePricingV2 } from "@shared/ride/pricing-v2/PricingEngineV2";
import {
  calculatePriceFromMargin,
  resolvePricingDistanceKm,
  roundSellingPrice,
} from "@shared/ride/pricing-v2/pricing.utils";
import { calculateDriverCostV2 } from "@shared/ride/pricing-v2/driver-cost";
import { calculateTollCostV2 } from "@shared/ride/pricing-v2/toll-cost";
import { calculateDepreciationCostV2 } from "@shared/ride/pricing-v2/depreciation-cost";
import { calculateOperatingCostV2 } from "@shared/ride/pricing-v2/operating-cost";
import { calculateFuelCostV2 } from "@shared/ride/pricing-v2/fuel-cost";
import { calculateTripQuote } from "@shared/ride/quote-engine";
import {
  DEFAULT_VEHICLE_PRICING,
  type VehiclePricingConfig,
} from "@shared/ride/vehicle-pricing";

const baseCfg: VehiclePricingConfig = {
  ...DEFAULT_VEHICLE_PRICING,
  startupFee: 200_000,
  baseFare: 200_000,
  pricePerKm: 12_000,
  driverRate: 150_000,
  waitingHourlyRate: 100_000,
  depreciationPerKm: 2_000,
  operatingCostPerKm: 1_000,
  dailyRate: 1_500_000,
  includedKm: 200,
  dailyIncludedKm: 200,
  extraKmRate: 10_000,
  minimumTripPrice: 0,
  targetMargin: 0.3,
  priceRoundingUnit: 10_000,
  pricingStrategy: "PER_KM",
};

function fuelOk(price = 25_000, consumption = 11.5) {
  return {
    fuelType: "E10_RON95_III",
    pricePerLiter: price,
    priceSource: "PVOIL" as const,
    priceDate: "2026-10-01T08:00:00.000Z",
    status: "ok" as const,
    consumptionLPer100Km: consumption,
    consumptionSource: "VEHICLE_CONFIG" as const,
  };
}

describe("pricing utils (12, 14, 16)", () => {
  it("12: target margin uses cost/(1-m) not cost*(1+m)", () => {
    const price = calculatePriceFromMargin(1_000_000, 0.3);
    expect(price).toBeCloseTo(1_428_571.42857, 2);
    expect(price).not.toBeCloseTo(1_300_000, 0);
  });

  it("14: rounds selling price up to unit", () => {
    expect(roundSellingPrice(2_413_250, 10_000)).toBe(2_420_000);
  });

  it("16: margin from profit/finalPrice", () => {
    const cost = 1_000_000;
    const price = calculatePriceFromMargin(cost, 0.3);
    const profit = price - cost;
    expect(profit / price).toBeCloseTo(0.3, 10);
  });
});

describe("distance ROUND_TRIP (2, 17)", () => {
  it("2/17: doubles one-way; does not double when already round-trip", () => {
    expect(
      resolvePricingDistanceKm({
        tripType: "ROUND_TRIP",
        oneWayDistanceKm: 100,
      }).pricingDistanceKm,
    ).toBe(200);
    expect(
      resolvePricingDistanceKm({
        tripType: "ROUND_TRIP",
        oneWayDistanceKm: 200,
        distanceAlreadyRoundTrip: true,
      }).pricingDistanceKm,
    ).toBe(200);
  });
});

describe("cost calculators (5–9)", () => {
  it("5: waiting cost", () => {
    const d = calculateDriverCostV2({
      pricingDurationMinutes: 120,
      driverHourlyRate: 150_000,
      waitingHours: 1.5,
      waitingHourlyRate: 100_000,
    });
    expect(d.drivingHours).toBe(2);
    expect(d.waitingCost).toBe(150_000);
  });

  it("6: toll cost sums items", () => {
    const t = calculateTollCostV2([
      { name: "Cầu", amount: 35_000 },
      { name: "Trạm", amount: 50_000 },
    ]);
    expect(t.amount).toBe(85_000);
    expect(t.source).toBe("MANUAL");
  });

  it("7: depreciation", () => {
    expect(
      calculateDepreciationCostV2({
        pricingDistanceKm: 120,
        depreciationPerKm: 2_000,
      }).depreciationCost,
    ).toBe(240_000);
  });

  it("8: operating cost", () => {
    expect(
      calculateOperatingCostV2({
        pricingDistanceKm: 120,
        operatingCostPerKm: 1_000,
      }).operatingCost,
    ).toBe(120_000);
  });

  it("9: fuel calculation example 200km × 11.5 × 25000", () => {
    const f = calculateFuelCostV2({
      pricingDistanceKm: 200,
      operationalDistanceFactor: 1,
      consumptionLPer100Km: 11.5,
      pricePerLiter: 25_000,
    });
    expect(f.estimatedLiters).toBeCloseTo(23, 6);
    expect(f.fuelCost).toBe(575_000);
  });
});

describe("PricingEngineV2 scenarios (1, 3, 4, 10, 11, 13, 15, 18–20)", () => {
  it("1: ONE_WAY produces recommended price and profit", () => {
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "ONE_WAY",
      oneWayDistanceKm: 100,
      oneWayDurationMinutes: 120,
      vehiclePricing: baseCfg,
      fuel: fuelOk(),
      tolls: [{ name: "Phí", amount: 50_000 }],
    });
    expect(r.pricingEngineVersion).toBe("v2");
    expect(r.route.pricingDistanceKm).toBe(100);
    expect(r.cost.totalCost).toBeGreaterThan(0);
    expect(r.pricing.finalPrice).toBeGreaterThanOrEqual(r.pricing.recommendedPriceBeforeRound);
    expect(r.profit).toBe(r.pricing.finalPrice - r.cost.totalCost);
    expect(r.margin).toBeCloseTo(r.profit / r.pricing.finalPrice, 6);
  });

  it("3: DAILY_RENTAL base without double pricePerKm", () => {
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "DAILY_RENTAL",
      oneWayDistanceKm: 180,
      oneWayDurationMinutes: 300,
      vehiclePricing: { ...baseCfg, pricingStrategy: "DAILY" },
      fuel: fuelOk(),
    });
    expect(r.pricing.strategy).toBe("DAILY");
    expect(r.pricing.basePrice).toBe(1_500_000);
    expect(r.pricing.extraKm).toBe(0);
    expect(r.cost.fuelCost).toBeGreaterThan(0);
  });

  it("4: extra km on daily rental", () => {
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "DAILY_RENTAL",
      oneWayDistanceKm: 250,
      oneWayDurationMinutes: 400,
      vehiclePricing: { ...baseCfg, pricingStrategy: "DAILY" },
      fuel: fuelOk(),
    });
    expect(r.pricing.extraKm).toBe(50);
    expect(r.pricing.extraKmCost).toBe(500_000);
    expect(r.pricing.basePrice).toBe(2_000_000);
  });

  it("10: missing fuel price does not throw", () => {
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "ONE_WAY",
      oneWayDistanceKm: 50,
      oneWayDurationMinutes: 60,
      vehiclePricing: baseCfg,
      fuel: {
        fuelType: "E10_RON95_III",
        pricePerLiter: null,
        priceSource: "NONE",
        priceDate: null,
        status: "missing",
        consumptionLPer100Km: 11.5,
        consumptionSource: "VEHICLE_CONFIG",
      },
    });
    expect(r.fuel.fuelPriceStatus).toBe("missing");
    expect(r.fuel.fuelCost).toBe(0);
    expect(r.warnings.some((w) => w.includes("PVOIL"))).toBe(true);
    expect(r.pricing.finalPrice).toBeGreaterThan(0);
  });

  it("11: missing consumption soft-fails fuel only", () => {
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "ONE_WAY",
      oneWayDistanceKm: 50,
      oneWayDurationMinutes: 60,
      vehiclePricing: baseCfg,
      fuel: {
        fuelType: "",
        pricePerLiter: 25_000,
        priceSource: "PVOIL",
        priceDate: "2026-10-01T00:00:00.000Z",
        status: "ok",
        consumptionLPer100Km: null,
        consumptionSource: "MISSING",
      },
    });
    expect(r.fuel.fuelCost).toBe(0);
    expect(r.warnings.some((w) => w.includes("Tiêu hao"))).toBe(true);
  });

  it("13: minimum trip price enforced", () => {
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "ONE_WAY",
      oneWayDistanceKm: 5,
      oneWayDurationMinutes: 15,
      vehiclePricing: {
        ...baseCfg,
        minimumTripPrice: 5_000_000,
        depreciationPerKm: 0,
        operatingCostPerKm: 0,
      },
      fuel: fuelOk(20_000, 8),
      tolls: [],
    });
    expect(r.pricing.finalPrice).toBeGreaterThanOrEqual(5_000_000);
  });

  it("15: base price lower than cost-plus picks cost-plus", () => {
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "ONE_WAY",
      oneWayDistanceKm: 200,
      oneWayDurationMinutes: 240,
      vehiclePricing: {
        ...baseCfg,
        startupFee: 0,
        baseFare: 0,
        pricePerKm: 1_000,
        targetMargin: 0.3,
        priceRoundingUnit: 1,
      },
      fuel: fuelOk(25_000, 11.5),
      tolls: [{ name: "t", amount: 200_000 }],
    });
    expect(r.pricing.basePrice).toBeLessThan(r.pricing.costPlusPrice);
    expect(r.pricing.recommendedPriceBeforeRound).toBeCloseTo(
      r.pricing.costPlusPrice,
      2,
    );
    expect(
      r.warnings.some((w) => w.includes("bảng thấp hơn")),
    ).toBe(true);
  });

  it("18: PVOIL snapshot fields preserved on result", () => {
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "ONE_WAY",
      oneWayDistanceKm: 10,
      oneWayDurationMinutes: 20,
      vehiclePricing: baseCfg,
      fuel: fuelOk(25_630, 11.5),
    });
    expect(r.fuel.priceSource).toBe("PVOIL");
    expect(r.fuel.priceDate).toBe("2026-10-01T08:00:00.000Z");
    expect(r.fuel.pricePerLiter).toBe(25_630);
  });

  it("19: ORS/input route snapshot fields", () => {
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "ONE_WAY",
      oneWayDistanceKm: 120,
      oneWayDurationMinutes: 135,
      vehiclePricing: baseCfg,
      fuel: fuelOk(),
    });
    expect(r.route.oneWayDistanceKm).toBe(120);
    expect(r.route.pricingDurationMinutes).toBe(135);
    expect(r.calculationInputs.distanceKm).toBe(120);
  });

  it("20: legacy calculateTripQuote still works (compat)", () => {
    const q = calculateTripQuote({
      tripType: "ONE_WAY",
      distanceKm: 100,
      durationMinutes: 90,
      pricingConfig: DEFAULT_VEHICLE_PRICING,
      fuelOverride: {
        estimatedLiters: 8,
        fuelCost: 184_000,
        fuelPricePerLiter: 23_000,
        consumptionLPer100Km: 8,
        billableDistanceKm: 100,
        operationalDistanceKm: 100,
        operationalDistanceFactor: 1,
      },
    });
    expect(q.autoQuote).toBe(true);
    expect(q.totalPrice).toBeGreaterThan(0);
  });

  it("special: cost 1e6 margin 30% before rounding", () => {
    const price = calculatePriceFromMargin(1_000_000, 0.3);
    expect(price).toBeCloseTo(1_428_571.43, 1);
    const r = calculatePricingV2({
      vehicleId: "v1",
      tripType: "ONE_WAY",
      oneWayDistanceKm: 0,
      oneWayDurationMinutes: 0,
      vehiclePricing: {
        ...baseCfg,
        startupFee: 0,
        baseFare: 0,
        pricePerKm: 0,
        driverRate: 0,
        depreciationPerKm: 0,
        operatingCostPerKm: 0,
        pricingStrategy: "COST_PLUS",
        priceRoundingUnit: 1,
        targetMargin: 0.3,
      },
      fuel: {
        fuelType: "E10_RON95_III",
        pricePerLiter: null,
        priceSource: "NONE",
        priceDate: null,
        status: "missing",
        consumptionLPer100Km: null,
        consumptionSource: "MISSING",
      },
      otherCosts: 1_000_000,
    });
    expect(r.cost.totalCost).toBe(1_000_000);
    expect(r.pricing.recommendedPriceBeforeRound).toBeCloseTo(1_428_571.43, 1);
    expect(r.margin).toBeCloseTo(0.3, 5);
  });
});

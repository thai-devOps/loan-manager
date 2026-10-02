import {
  DEFAULT_PRICE_ROUNDING_UNIT,
  DEFAULT_TARGET_MARGIN,
  PRICING_ENGINE_VERSION,
} from "./pricing.constants.js";
import { calculateDepreciationCostV2 } from "./depreciation-cost.js";
import { calculateDriverCostV2 } from "./driver-cost.js";
import { calculateFuelCostV2 } from "./fuel-cost.js";
import { calculateOperatingCostV2 } from "./operating-cost.js";
import type {
  PricingV2EngineInput,
  PricingV2EngineResult,
} from "./pricing.types.js";
import {
  computeMargin,
  resolvePricingDistanceKm,
  resolvePricingDurationMinutes,
} from "./pricing.utils.js";
import {
  calculateBasePrice,
  calculateSellingPriceV2,
  resolveStrategy,
} from "./selling-price.js";
import { calculateTollCostV2 } from "./toll-cost.js";

export function calculatePricingV2(
  input: PricingV2EngineInput,
): PricingV2EngineResult {
  const warnings: string[] = [];
  const cfg = input.vehiclePricing;

  if (!(input.oneWayDistanceKm >= 0) || !Number.isFinite(input.oneWayDistanceKm)) {
    throw new Error("DISTANCE_INVALID");
  }

  const dist = resolvePricingDistanceKm({
    tripType: input.tripType,
    oneWayDistanceKm: input.oneWayDistanceKm,
    distanceAlreadyRoundTrip: input.distanceAlreadyRoundTrip,
  });
  const dur = resolvePricingDurationMinutes({
    tripType: input.tripType,
    oneWayDurationMinutes: input.oneWayDurationMinutes,
    distanceAlreadyRoundTrip: input.distanceAlreadyRoundTrip,
  });

  const factor =
    input.operationalDistanceFactor != null &&
    Number.isFinite(input.operationalDistanceFactor) &&
    input.operationalDistanceFactor >= 1
      ? input.operationalDistanceFactor
      : 1;

  const routeType = input.routeType ?? "mixed";

  if (input.fuel.status === "missing") {
    warnings.push(
      "Không tìm thấy giá nhiên liệu cho ngày chuyến — chi phí nhiên liệu = 0.",
    );
  } else if (input.fuel.status === "fallback_latest") {
    warnings.push(
      "Không tìm thấy giá nhiên liệu đúng ngày chuyến, sử dụng giá gần nhất.",
    );
  }
  if (input.fuel.consumptionSource === "MISSING") {
    warnings.push("Tiêu hao đang thiếu — chi phí nhiên liệu = 0.");
  } else if (
    input.fuel.consumptionLPer100Km != null &&
    cfg.defaultConsumption != null &&
    input.fuel.consumptionLPer100Km === cfg.defaultConsumption &&
    !input.routeType
  ) {
    warnings.push("Tiêu hao đang sử dụng giá trị mặc định.");
  }

  const fuelCalc = calculateFuelCostV2({
    pricingDistanceKm: dist.pricingDistanceKm,
    operationalDistanceFactor: factor,
    consumptionLPer100Km: input.fuel.consumptionLPer100Km,
    pricePerLiter: input.fuel.pricePerLiter,
  });

  const driver = calculateDriverCostV2({
    pricingDurationMinutes: dur.pricingDurationMinutes,
    driverHourlyRate: cfg.driverRate,
    waitingHours: input.waitingHours,
    waitingHourlyRate: cfg.waitingHourlyRate,
  });

  const toll = calculateTollCostV2(input.tolls);
  if (toll.items.length === 0) {
    warnings.push("Phí cầu đường chưa được nhập.");
  }

  const depreciation = calculateDepreciationCostV2({
    pricingDistanceKm: dist.pricingDistanceKm,
    depreciationPerKm: cfg.depreciationPerKm ?? 0,
  });
  const operating = calculateOperatingCostV2({
    pricingDistanceKm: dist.pricingDistanceKm,
    operatingCostPerKm: cfg.operatingCostPerKm ?? 0,
  });

  const otherCost = Math.max(0, Number(input.otherCosts) || 0);

  const totalCost =
    fuelCalc.fuelCost +
    driver.drivingCost +
    driver.waitingCost +
    toll.amount +
    depreciation.depreciationCost +
    operating.operatingCost +
    otherCost;

  const strategy = resolveStrategy(
    input.tripType,
    input.pricingStrategy ?? cfg.pricingStrategy,
  );
  const startupFee = cfg.startupFee ?? cfg.baseFare;
  const dailyIncludedKm = cfg.dailyIncludedKm ?? cfg.includedKm;
  const targetMargin =
    cfg.targetMargin != null &&
    cfg.targetMargin >= 0 &&
    cfg.targetMargin < 1
      ? cfg.targetMargin
      : DEFAULT_TARGET_MARGIN;
  const minimumTripPrice = Math.max(0, cfg.minimumTripPrice ?? 0);
  const priceRoundingUnit =
    cfg.priceRoundingUnit && cfg.priceRoundingUnit > 0
      ? Number(cfg.priceRoundingUnit)
      : DEFAULT_PRICE_ROUNDING_UNIT;

  const base = calculateBasePrice({
    strategy,
    pricingDistanceKm: dist.pricingDistanceKm,
    startupFee,
    pricePerKm: cfg.pricePerKm,
    dailyRate: cfg.dailyRate,
    dailyIncludedKm,
    extraKmRate: cfg.extraKmRate,
  });

  const selling = calculateSellingPriceV2({
    strategy,
    totalCost,
    targetMargin,
    minimumTripPrice,
    basePrice: base.basePrice,
    priceRoundingUnit,
  });

  const profit = selling.finalPrice - totalCost;
  const margin = computeMargin(profit, selling.finalPrice);
  const marginPercent = margin * 100;

  if (margin + 1e-9 < targetMargin && selling.finalPrice > 0) {
    warnings.push("Giá đề xuất thấp hơn mức margin mục tiêu.");
  }
  if (base.basePrice + 1e-6 < selling.costPlusPrice) {
    warnings.push(
      "Giá theo bảng thấp hơn giá tối thiểu theo margin — đã lấy giá cost-plus.",
    );
  }

  const calculationInputs: Record<string, unknown> = {
    distanceKm: dist.pricingDistanceKm,
    oneWayDistanceKm: dist.oneWayDistanceKm,
    consumption: input.fuel.consumptionLPer100Km,
    fuelPrice: input.fuel.pricePerLiter,
    fuelCost: fuelCalc.fuelCost,
    driverHours: driver.drivingHours,
    driverRate: cfg.driverRate,
    depreciationPerKm: depreciation.depreciationPerKm,
    operatingCostPerKm: operating.operatingCostPerKm,
    tollCost: toll.amount,
    targetMargin,
    operationalDistanceFactor: factor,
  };

  return {
    pricingEngineVersion: PRICING_ENGINE_VERSION,
    tripType: input.tripType,
    route: {
      oneWayDistanceKm: dist.oneWayDistanceKm,
      pricingDistanceKm: dist.pricingDistanceKm,
      oneWayDurationMinutes: dur.oneWayDurationMinutes,
      pricingDurationMinutes: dur.pricingDurationMinutes,
      routeType,
      operationalDistanceKm: fuelCalc.operationalDistanceKm,
      operationalDistanceFactor: factor,
      source: "INPUT",
    },
    fuel: {
      fuelType: input.fuel.fuelType,
      pricePerLiter: input.fuel.pricePerLiter,
      priceSource: input.fuel.priceSource,
      priceDate: input.fuel.priceDate,
      fuelPriceStatus: input.fuel.status,
      consumptionLPer100Km: input.fuel.consumptionLPer100Km,
      consumptionSource: input.fuel.consumptionSource,
      estimatedLiters: fuelCalc.estimatedLiters,
      fuelCost: fuelCalc.fuelCost,
    },
    driver: {
      drivingHours: driver.drivingHours,
      waitingHours: driver.waitingHours,
      drivingCost: driver.drivingCost,
      waitingCost: driver.waitingCost,
      total: driver.total,
    },
    toll,
    vehicle: {
      depreciationPerKm: depreciation.depreciationPerKm,
      depreciationCost: depreciation.depreciationCost,
      operatingCostPerKm: operating.operatingCostPerKm,
      operatingCost: operating.operatingCost,
    },
    cost: {
      fuelCost: fuelCalc.fuelCost,
      driverCost: driver.drivingCost,
      waitingCost: driver.waitingCost,
      tollCost: toll.amount,
      depreciationCost: depreciation.depreciationCost,
      operatingCost: operating.operatingCost,
      otherCost,
      totalCost,
    },
    pricing: {
      strategy,
      source: strategy,
      startupFee,
      pricePerKm: cfg.pricePerKm,
      dailyRate: cfg.dailyRate,
      dailyIncludedKm,
      extraKmRate: cfg.extraKmRate,
      extraKm: base.extraKm,
      extraKmCost: base.extraKmCost,
      minimumTripPrice,
      targetMargin,
      basePrice: base.basePrice,
      costPlusPrice: selling.costPlusPrice,
      recommendedPriceBeforeRound: selling.recommendedPriceBeforeRound,
      recommendedPrice: selling.recommendedPrice,
      finalPrice: selling.finalPrice,
      priceRoundingUnit,
    },
    profit,
    margin,
    marginPercent,
    warnings,
    calculationInputs,
  };
}

export { calculatePricingV2 as calculatePricing };

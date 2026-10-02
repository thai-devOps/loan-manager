import type { VehiclePricingConfig } from "./vehicle-pricing.js";

export type QuoteTripType = "ONE_WAY" | "ROUND_TRIP" | "DAILY" | "CUSTOM";

export type QuoteFuelOverride = {
  estimatedLiters: number;
  fuelCost: number;
  fuelPricePerLiter: number;
  consumptionLPer100Km: number;
  billableDistanceKm: number;
  operationalDistanceKm: number;
  operationalDistanceFactor: number;
};

export type QuoteEngineInput = {
  tripType: QuoteTripType;
  distanceKm: number;
  durationMinutes: number;
  pricingConfig: VehiclePricingConfig;
  tollFee?: number;
  parkingFee?: number;
  waitingFee?: number;
  /** When set, fuel is taken from Petrolimex estimate (operational km). */
  fuelOverride?: QuoteFuelOverride | null;
};

export type QuoteBreakdownLine = {
  label: string;
  amount: number;
};

/**
 * ONE_WAY / ROUND_TRIP:
 *   fare = baseFare + billableKm * pricePerKm
 *   operatingCost = fuelCost + driverCost
 *   total = fare + operatingCost + toll + parking + waiting
 *
 * DAILY (BY_DAY):
 *   total = dailyRate + extraKm * extraKmRate + toll + parking + waiting
 *   (fuel/driver shown in breakdown for transparency, not added again)
 *
 * CUSTOM: no auto total.
 */
export type QuoteEngineResult = {
  autoQuote: boolean;
  distanceKm: number;
  durationMinutes: number;
  billableKm: number;
  operationalDistanceKm: number;
  operationalDistanceFactor: number;
  fuelLiters: number;
  fuelCost: number;
  fuelPricePerLiter: number;
  fuelConsumptionPer100Km: number;
  driverCost: number;
  tollFee: number;
  parkingFee: number;
  waitingFee: number;
  additionalFee: number;
  operatingCost: number;
  fare: number;
  subtotal: number;
  totalPrice: number | null;
  breakdown: QuoteBreakdownLine[];
};

function roundMoney(n: number): number {
  return Math.round(n);
}

function driverHours(durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return Math.max(1, Math.ceil(durationMinutes / 60));
}

export function calculateTripQuote(input: QuoteEngineInput): QuoteEngineResult {
  const tollFee = Math.max(0, Number(input.tollFee) || 0);
  const parkingFee = Math.max(0, Number(input.parkingFee) || 0);
  const waitingFee = Math.max(0, Number(input.waitingFee) || 0);
  const additionalFee = tollFee + parkingFee + waitingFee;
  const cfg = input.pricingConfig;

  if (input.tripType === "CUSTOM") {
    return {
      autoQuote: false,
      distanceKm: Math.max(0, input.distanceKm),
      durationMinutes: Math.max(0, input.durationMinutes),
      billableKm: Math.max(0, input.distanceKm),
      operationalDistanceKm: Math.max(0, input.distanceKm),
      operationalDistanceFactor: 1,
      fuelLiters: 0,
      fuelCost: 0,
      fuelPricePerLiter: 0,
      fuelConsumptionPer100Km: 0,
      driverCost: 0,
      tollFee,
      parkingFee,
      waitingFee,
      additionalFee,
      operatingCost: 0,
      fare: 0,
      subtotal: 0,
      totalPrice: null,
      breakdown: [{ label: "Báo giá thủ công", amount: 0 }],
    };
  }

  const oneWayKm = Math.max(0, Number(input.distanceKm) || 0);
  const oneWayMinutes = Math.max(0, Number(input.durationMinutes) || 0);
  const isRound = input.tripType === "ROUND_TRIP";
  const billableKm = isRound ? oneWayKm * 2 : oneWayKm;
  const durationMinutes = isRound ? oneWayMinutes * 2 : oneWayMinutes;

  const fuelOverride = input.fuelOverride;
  const fuelLiters = fuelOverride
    ? fuelOverride.estimatedLiters
    : (billableKm * (Number(cfg.fuelConsumptionPer100Km) || 0)) / 100;
  const fuelPricePerLiter = fuelOverride
    ? fuelOverride.fuelPricePerLiter
    : Number(cfg.fuelPricePerLiter) || 0;
  const fuelConsumptionPer100Km = fuelOverride
    ? fuelOverride.consumptionLPer100Km
    : Number(cfg.fuelConsumptionPer100Km) || 0;
  const fuelCost = fuelOverride
    ? fuelOverride.fuelCost
    : roundMoney(fuelLiters * fuelPricePerLiter);
  const operationalDistanceKm = fuelOverride
    ? fuelOverride.operationalDistanceKm
    : billableKm;
  const operationalDistanceFactor = fuelOverride
    ? fuelOverride.operationalDistanceFactor
    : 1;

  const driverCost = roundMoney(driverHours(durationMinutes) * cfg.driverRate);
  const operatingCost = fuelCost + driverCost;

  if (input.tripType === "DAILY") {
    const extraKm = Math.max(0, billableKm - cfg.includedKm);
    const extraKmCost = roundMoney(extraKm * cfg.extraKmRate);
    const fare = roundMoney(cfg.dailyRate + extraKmCost);
    const totalPrice = fare + additionalFee;
    const breakdown: QuoteBreakdownLine[] = [
      { label: "Giá theo ngày", amount: roundMoney(cfg.dailyRate) },
      { label: "Km vượt định mức", amount: extraKmCost },
      { label: "Nhiên liệu (tham khảo)", amount: fuelCost },
      { label: "Phí tài xế (tham khảo)", amount: driverCost },
      { label: "Phí cầu đường", amount: tollFee },
      { label: "Phí đỗ xe", amount: parkingFee },
      { label: "Phí chờ", amount: waitingFee },
    ];
    return {
      autoQuote: true,
      distanceKm: billableKm,
      durationMinutes,
      billableKm,
      operationalDistanceKm,
      operationalDistanceFactor,
      fuelLiters,
      fuelCost,
      fuelPricePerLiter,
      fuelConsumptionPer100Km,
      driverCost,
      tollFee,
      parkingFee,
      waitingFee,
      additionalFee,
      operatingCost,
      fare,
      subtotal: totalPrice,
      totalPrice,
      breakdown,
    };
  }

  // ONE_WAY | ROUND_TRIP
  const fare = roundMoney(cfg.baseFare + billableKm * cfg.pricePerKm);
  const totalPrice = fare + operatingCost + additionalFee;
  const breakdown: QuoteBreakdownLine[] = [
    { label: "Cước cơ bản", amount: roundMoney(cfg.baseFare) },
    {
      label: isRound ? "Cước theo km (khứ hồi)" : "Cước theo km",
      amount: roundMoney(billableKm * cfg.pricePerKm),
    },
    { label: "Nhiên liệu dự kiến", amount: fuelCost },
    { label: "Phí tài xế", amount: driverCost },
    { label: "Phí cầu đường", amount: tollFee },
    { label: "Phí đỗ xe", amount: parkingFee },
    { label: "Phí chờ", amount: waitingFee },
  ];

  return {
    autoQuote: true,
    distanceKm: billableKm,
    durationMinutes,
    billableKm,
    operationalDistanceKm,
    operationalDistanceFactor,
    fuelLiters,
    fuelCost,
    fuelPricePerLiter,
    fuelConsumptionPer100Km,
    driverCost,
    tollFee,
    parkingFee,
    waitingFee,
    additionalFee,
    operatingCost,
    fare,
    subtotal: totalPrice,
    totalPrice,
    breakdown,
  };
}

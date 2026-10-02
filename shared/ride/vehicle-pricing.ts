export const VEHICLE_FUEL_TYPES = [
  "E10_RON95_III",
  "E5_RON92_II",
  "DO_005S_II",
  "DO_0001S_V",
] as const;

export type VehicleFuelType = (typeof VEHICLE_FUEL_TYPES)[number];

export const CONSUMPTION_SOURCES = [
  "manufacturer",
  "manual",
  "estimated",
  "actual",
] as const;

export type ConsumptionSource = (typeof CONSUMPTION_SOURCES)[number];

export type RouteCondition = "city" | "highway" | "mixed";

export type FuelConsumptionRates = {
  city: number;
  highway: number;
  mixed: number;
};

export const PRICING_STRATEGIES = ["PER_KM", "DAILY", "COST_PLUS"] as const;
export type PricingStrategy = (typeof PRICING_STRATEGIES)[number];

export const PRICE_ROUNDING_UNITS = [1_000, 5_000, 10_000, 50_000] as const;
export type PriceRoundingUnit = (typeof PRICE_ROUNDING_UNITS)[number];

export type VehiclePricingConfig = {
  /** PVOIL product code used for quotation fuel price lookup. */
  fuelType?: VehicleFuelType | string;
  /** L/100km by route condition. */
  fuelConsumption?: FuelConsumptionRates;
  /** Fallback L/100km when routeCondition is unset. */
  defaultConsumption?: number;
  consumptionSource?: ConsumptionSource;
  consumptionUpdatedAt?: string;
  /**
   * Legacy single consumption (L/100km). Kept for backward compatibility;
   * quotation prefers fuelConsumption / defaultConsumption.
   */
  fuelConsumptionPer100Km: number;
  /**
   * Deprecated for quotation (PVOIL is source of truth).
   * Still allowed for trip actual-cost entry.
   */
  fuelPricePerLiter: number;
  /** Hourly driver rate (legacy name). */
  driverRate: number;
  /** Legacy startup / base fare. Alias of startupFee. */
  baseFare: number;
  /** Pricing Engine v2 alias for baseFare. */
  startupFee?: number;
  pricePerKm: number;
  dailyRate: number;
  includedKm: number;
  /** Alias used by Pricing Engine v2 docs. */
  dailyIncludedKm?: number;
  extraKmRate: number;
  waitingHourlyRate?: number;
  depreciationPerKm?: number;
  operatingCostPerKm?: number;
  minimumTripPrice?: number;
  /** Target margin as fraction 0 <= m < 1 (e.g. 0.30 = 30%). */
  targetMargin?: number;
  priceRoundingUnit?: PriceRoundingUnit | number;
  pricingStrategy?: PricingStrategy;
};

/** Fare/driver defaults when a vehicle has no pricing block. Fuel is NOT defaulted for quotes. */
export const DEFAULT_VEHICLE_PRICING: VehiclePricingConfig = {
  fuelConsumptionPer100Km: 0,
  fuelPricePerLiter: 0,
  driverRate: 150_000,
  baseFare: 200_000,
  startupFee: 200_000,
  pricePerKm: 12_000,
  dailyRate: 1_500_000,
  includedKm: 200,
  dailyIncludedKm: 200,
  extraKmRate: 10_000,
  waitingHourlyRate: 0,
  depreciationPerKm: 0,
  operatingCostPerKm: 0,
  minimumTripPrice: 0,
  targetMargin: 0.3,
  priceRoundingUnit: 10_000,
  pricingStrategy: "PER_KM",
};

export const FUEL_TYPE_LABELS: Record<VehicleFuelType, string> = {
  E10_RON95_III: "E10 RON 95-III",
  E5_RON92_II: "E5 RON 92-II",
  DO_005S_II: "DO 0,05S-II",
  DO_0001S_V: "DO 0,001S-V",
};

export const CONSUMPTION_SOURCE_LABELS: Record<ConsumptionSource, string> = {
  manufacturer: "Nhà sản xuất",
  manual: "Nhập thủ công",
  estimated: "Ước lượng",
  actual: "Thực tế",
};

export const PRICING_STRATEGY_LABELS: Record<PricingStrategy, string> = {
  PER_KM: "Theo km",
  DAILY: "Theo ngày",
  COST_PLUS: "Cost-plus (margin)",
};

export function isVehicleFuelType(v: unknown): v is VehicleFuelType {
  return (
    typeof v === "string" &&
    (VEHICLE_FUEL_TYPES as readonly string[]).includes(v)
  );
}

export function isConsumptionSource(v: unknown): v is ConsumptionSource {
  return (
    typeof v === "string" &&
    (CONSUMPTION_SOURCES as readonly string[]).includes(v)
  );
}

export function isPricingStrategy(v: unknown): v is PricingStrategy {
  return (
    typeof v === "string" &&
    (PRICING_STRATEGIES as readonly string[]).includes(v)
  );
}

export function isPriceRoundingUnit(v: unknown): v is PriceRoundingUnit {
  const n = typeof v === "number" ? v : Number(v);
  return (PRICE_ROUNDING_UNITS as readonly number[]).includes(n);
}

function positiveNumber(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function nonNegativeNumber(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function parseConsumptionRates(
  raw?: Partial<FuelConsumptionRates> | null,
): FuelConsumptionRates | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const city = positiveNumber(raw.city);
  const highway = positiveNumber(raw.highway);
  const mixed = positiveNumber(raw.mixed);
  if (city == null || highway == null || mixed == null) return undefined;
  return { city, highway, mixed };
}

function parseTargetMargin(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0 || n >= 1) return fallback;
  return n;
}

export function resolveVehiclePricing(
  raw?: Partial<VehiclePricingConfig> | null,
  fuelFallback?: string,
): VehiclePricingConfig {
  const d = DEFAULT_VEHICLE_PRICING;
  const fuelConsumption = parseConsumptionRates(raw?.fuelConsumption);
  const defaultConsumption =
    positiveNumber(raw?.defaultConsumption) ??
    (fuelConsumption ? fuelConsumption.mixed : null) ??
    positiveNumber(raw?.fuelConsumptionPer100Km) ??
    undefined;

  const fuelTypeRaw = (raw?.fuelType ?? fuelFallback ?? "").toString().trim();
  const fuelType = isVehicleFuelType(fuelTypeRaw) ? fuelTypeRaw : undefined;

  const legacyConsumption =
    positiveNumber(raw?.fuelConsumptionPer100Km) ??
    defaultConsumption ??
    0;

  const baseFare = nonNegativeNumber(
    raw?.baseFare ?? raw?.startupFee,
    d.baseFare,
  );
  const startupFee = nonNegativeNumber(
    raw?.startupFee ?? raw?.baseFare,
    baseFare,
  );
  const includedKm = nonNegativeNumber(
    raw?.includedKm ?? raw?.dailyIncludedKm,
    d.includedKm,
  );

  return {
    fuelType,
    fuelConsumption,
    defaultConsumption,
    consumptionSource: isConsumptionSource(raw?.consumptionSource)
      ? raw!.consumptionSource
      : undefined,
    consumptionUpdatedAt:
      typeof raw?.consumptionUpdatedAt === "string" &&
      raw.consumptionUpdatedAt.trim()
        ? raw.consumptionUpdatedAt.trim()
        : undefined,
    fuelConsumptionPer100Km: legacyConsumption,
    fuelPricePerLiter:
      Number(raw?.fuelPricePerLiter) > 0
        ? Number(raw?.fuelPricePerLiter)
        : d.fuelPricePerLiter,
    driverRate: nonNegativeNumber(raw?.driverRate, d.driverRate),
    baseFare,
    startupFee,
    pricePerKm: nonNegativeNumber(raw?.pricePerKm, d.pricePerKm),
    dailyRate: nonNegativeNumber(raw?.dailyRate, d.dailyRate),
    includedKm,
    dailyIncludedKm: includedKm,
    extraKmRate: nonNegativeNumber(raw?.extraKmRate, d.extraKmRate),
    waitingHourlyRate: nonNegativeNumber(
      raw?.waitingHourlyRate,
      d.waitingHourlyRate ?? 0,
    ),
    depreciationPerKm: nonNegativeNumber(
      raw?.depreciationPerKm,
      d.depreciationPerKm ?? 0,
    ),
    operatingCostPerKm: nonNegativeNumber(
      raw?.operatingCostPerKm,
      d.operatingCostPerKm ?? 0,
    ),
    minimumTripPrice: nonNegativeNumber(
      raw?.minimumTripPrice,
      d.minimumTripPrice ?? 0,
    ),
    targetMargin: parseTargetMargin(raw?.targetMargin, d.targetMargin ?? 0.3),
    priceRoundingUnit: isPriceRoundingUnit(raw?.priceRoundingUnit)
      ? (Number(raw?.priceRoundingUnit) as PriceRoundingUnit)
      : (d.priceRoundingUnit as PriceRoundingUnit),
    pricingStrategy: isPricingStrategy(raw?.pricingStrategy)
      ? raw!.pricingStrategy
      : d.pricingStrategy,
  };
}

export type VehicleFuelConfigErrorCode =
  | "VEHICLE_FUEL_CONFIG_MISSING"
  | "FUEL_CONSUMPTION_INVALID";

export class VehicleFuelConfigError extends Error {
  readonly code: VehicleFuelConfigErrorCode;

  constructor(code: VehicleFuelConfigErrorCode, message: string) {
    super(message);
    this.name = "VehicleFuelConfigError";
    this.code = code;
  }
}

/** Require complete fuel config for quotation (no silent defaults). */
export function requireVehicleFuelConfig(
  pricing?: Partial<VehiclePricingConfig> | null,
): {
  fuelType: VehicleFuelType;
  fuelConsumption: FuelConsumptionRates;
  defaultConsumption: number;
  consumptionSource: ConsumptionSource;
} {
  if (!pricing) {
    throw new VehicleFuelConfigError(
      "VEHICLE_FUEL_CONFIG_MISSING",
      "Xe chưa cấu hình nhiên liệu. Vui lòng cập nhật trong quản lý xe.",
    );
  }
  if (!isVehicleFuelType(pricing.fuelType)) {
    throw new VehicleFuelConfigError(
      "VEHICLE_FUEL_CONFIG_MISSING",
      "Xe chưa chọn loại nhiên liệu (PVOIL).",
    );
  }
  const rates = parseConsumptionRates(pricing.fuelConsumption);
  const defaultConsumption =
    positiveNumber(pricing.defaultConsumption) ??
    (rates ? rates.mixed : null) ??
    positiveNumber(pricing.fuelConsumptionPer100Km);

  if (!rates || defaultConsumption == null) {
    throw new VehicleFuelConfigError(
      "VEHICLE_FUEL_CONFIG_MISSING",
      "Xe chưa cấu hình mức tiêu hao (đô thị / đường trường / hỗn hợp).",
    );
  }
  if (
    rates.city <= 0 ||
    rates.highway <= 0 ||
    rates.mixed <= 0 ||
    defaultConsumption <= 0
  ) {
    throw new VehicleFuelConfigError(
      "FUEL_CONSUMPTION_INVALID",
      "Mức tiêu hao nhiên liệu phải lớn hơn 0.",
    );
  }

  return {
    fuelType: pricing.fuelType,
    fuelConsumption: rates,
    defaultConsumption,
    consumptionSource: isConsumptionSource(pricing.consumptionSource)
      ? pricing.consumptionSource
      : "manual",
  };
}

import type {
  PricingStrategy,
  RouteCondition,
  VehiclePricingConfig,
} from "../vehicle-pricing.js";

export type PricingV2TripType = "ONE_WAY" | "ROUND_TRIP" | "DAILY_RENTAL";

export type FuelPriceStatus = "ok" | "missing" | "fallback_latest";

export type TollItem = {
  name: string;
  amount: number;
};

export type PricingV2Place = {
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type PricingV2EngineInput = {
  vehicleId: string;
  tripType: PricingV2TripType;
  /** One-way distance from ORS (or caller). */
  oneWayDistanceKm: number;
  /** One-way duration from ORS (or caller). */
  oneWayDurationMinutes: number;
  /**
   * When true, oneWayDistanceKm already represents the full round trip —
   * do not double again.
   */
  distanceAlreadyRoundTrip?: boolean;
  routeType?: RouteCondition | null;
  waitingHours?: number;
  tolls?: TollItem[];
  otherCosts?: number;
  operationalDistanceFactor?: number;
  vehiclePricing: VehiclePricingConfig;
  fuel: {
    fuelType: string;
    pricePerLiter: number | null;
    priceSource: "PVOIL" | "NONE";
    priceDate: string | null;
    status: FuelPriceStatus;
    consumptionLPer100Km: number | null;
    consumptionSource: "VEHICLE_CONFIG" | "MISSING";
  };
  origin?: PricingV2Place;
  destination?: PricingV2Place;
  travelDate?: string;
  /** Override strategy; else vehicle config / tripType default. */
  pricingStrategy?: PricingStrategy | null;
};

export type PricingV2CostBreakdown = {
  fuelCost: number;
  driverCost: number;
  waitingCost: number;
  tollCost: number;
  depreciationCost: number;
  operatingCost: number;
  otherCost: number;
  totalCost: number;
};

export type PricingV2EngineResult = {
  pricingEngineVersion: "v2";
  tripType: PricingV2TripType;
  route: {
    oneWayDistanceKm: number;
    pricingDistanceKm: number;
    oneWayDurationMinutes: number;
    pricingDurationMinutes: number;
    routeType: RouteCondition | "mixed";
    operationalDistanceKm: number;
    operationalDistanceFactor: number;
    source: "ORS" | "INPUT";
  };
  fuel: {
    fuelType: string;
    pricePerLiter: number | null;
    priceSource: "PVOIL" | "NONE";
    priceDate: string | null;
    fuelPriceStatus: FuelPriceStatus;
    consumptionLPer100Km: number | null;
    consumptionSource: "VEHICLE_CONFIG" | "MISSING";
    estimatedLiters: number;
    fuelCost: number;
  };
  driver: {
    drivingHours: number;
    waitingHours: number;
    drivingCost: number;
    waitingCost: number;
    total: number;
  };
  toll: {
    amount: number;
    source: "MANUAL";
    items: TollItem[];
  };
  vehicle: {
    depreciationPerKm: number;
    depreciationCost: number;
    operatingCostPerKm: number;
    operatingCost: number;
  };
  cost: PricingV2CostBreakdown;
  pricing: {
    strategy: PricingStrategy;
    source: PricingStrategy;
    startupFee: number;
    pricePerKm: number;
    dailyRate: number;
    dailyIncludedKm: number;
    extraKmRate: number;
    extraKm: number;
    extraKmCost: number;
    minimumTripPrice: number;
    targetMargin: number;
    basePrice: number;
    costPlusPrice: number;
    recommendedPriceBeforeRound: number;
    recommendedPrice: number;
    finalPrice: number;
    priceRoundingUnit: number;
  };
  profit: number;
  margin: number;
  marginPercent: number;
  warnings: string[];
  calculationInputs: Record<string, unknown>;
};

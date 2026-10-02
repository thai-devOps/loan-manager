import type {
  ConsumptionSource,
  PricingStrategy,
  Vehicle,
  VehicleFuelType,
  VehicleStatus,
} from "@/features/ride/types/ride";
import {
  CONSUMPTION_SOURCES,
  DEFAULT_VEHICLE_PRICING,
  PRICING_STRATEGIES,
  VEHICLE_FUEL_TYPES,
} from "@shared/ride/vehicle-pricing";

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  AVAILABLE: "Sẵn sàng",
  ON_TRIP: "Đang chạy",
  MAINTENANCE: "Bảo dưỡng",
  INACTIVE: "Ngưng",
};

export type VehicleFormState = {
  name: string;
  brand: string;
  model: string;
  licensePlate: string;
  seats: string;
  transmission: string;
  fuel: string;
  status: VehicleStatus;
  active: boolean;
  imageUrl: string;
  imagePublicId: string;
  features: string;
  suitableFor: string;
  fuelType: VehicleFuelType | "";
  consumptionCity: string;
  consumptionHighway: string;
  consumptionMixed: string;
  defaultConsumption: string;
  consumptionSource: ConsumptionSource | "";
  driverRate: string;
  baseFare: string;
  pricePerKm: string;
  dailyRate: string;
  includedKm: string;
  extraKmRate: string;
  waitingHourlyRate: string;
  depreciationPerKm: string;
  operatingCostPerKm: string;
  minimumTripPrice: string;
  targetMarginPercent: string;
  priceRoundingUnit: string;
  pricingStrategy: PricingStrategy | "";
};

export const emptyVehicleForm = (): VehicleFormState => ({
  name: "",
  brand: "",
  model: "",
  licensePlate: "",
  seats: "7",
  transmission: "Số tự động",
  fuel: "Xăng",
  status: "AVAILABLE",
  active: true,
  imageUrl: "",
  imagePublicId: "",
  features: "Xe riêng + tài xế",
  suitableFor: "travel",
  fuelType: "E10_RON95_III",
  consumptionCity: "",
  consumptionHighway: "",
  consumptionMixed: "",
  defaultConsumption: "",
  consumptionSource: "manual",
  driverRate: String(DEFAULT_VEHICLE_PRICING.driverRate),
  baseFare: String(DEFAULT_VEHICLE_PRICING.baseFare),
  pricePerKm: String(DEFAULT_VEHICLE_PRICING.pricePerKm),
  dailyRate: String(DEFAULT_VEHICLE_PRICING.dailyRate),
  includedKm: String(DEFAULT_VEHICLE_PRICING.includedKm),
  extraKmRate: String(DEFAULT_VEHICLE_PRICING.extraKmRate),
  waitingHourlyRate: String(DEFAULT_VEHICLE_PRICING.waitingHourlyRate ?? 0),
  depreciationPerKm: String(DEFAULT_VEHICLE_PRICING.depreciationPerKm ?? 0),
  operatingCostPerKm: String(DEFAULT_VEHICLE_PRICING.operatingCostPerKm ?? 0),
  minimumTripPrice: String(DEFAULT_VEHICLE_PRICING.minimumTripPrice ?? 0),
  targetMarginPercent: String(
    Math.round((DEFAULT_VEHICLE_PRICING.targetMargin ?? 0.3) * 100),
  ),
  priceRoundingUnit: String(DEFAULT_VEHICLE_PRICING.priceRoundingUnit ?? 10_000),
  pricingStrategy: DEFAULT_VEHICLE_PRICING.pricingStrategy ?? "PER_KM",
});

export function vehicleToForm(v: Vehicle): VehicleFormState {
  const p = v.pricing ?? DEFAULT_VEHICLE_PRICING;
  const rates = p.fuelConsumption;
  const legacy =
    p.fuelConsumptionPer100Km > 0 ? String(p.fuelConsumptionPer100Km) : "";
  const margin =
    p.targetMargin != null && Number.isFinite(p.targetMargin)
      ? p.targetMargin
      : (DEFAULT_VEHICLE_PRICING.targetMargin ?? 0.3);
  return {
    name: v.name,
    brand: v.brand,
    model: v.model,
    licensePlate: v.licensePlate ?? "",
    seats: String(v.seats),
    transmission: v.transmission,
    fuel: v.fuel,
    status: (v.status as VehicleStatus) || "AVAILABLE",
    active: v.active,
    imageUrl: v.images[0] ?? "",
    imagePublicId: v.imagePublicIds?.[0] ?? "",
    features: (v.features ?? []).join(", "),
    suitableFor: (v.suitableFor ?? []).join(", "),
    fuelType: (VEHICLE_FUEL_TYPES as readonly string[]).includes(
      String(p.fuelType ?? ""),
    )
      ? (p.fuelType as VehicleFuelType)
      : "",
    consumptionCity: rates?.city != null ? String(rates.city) : legacy,
    consumptionHighway: rates?.highway != null ? String(rates.highway) : legacy,
    consumptionMixed: rates?.mixed != null ? String(rates.mixed) : legacy,
    defaultConsumption:
      p.defaultConsumption != null && p.defaultConsumption > 0
        ? String(p.defaultConsumption)
        : legacy,
    consumptionSource: (CONSUMPTION_SOURCES as readonly string[]).includes(
      String(p.consumptionSource ?? ""),
    )
      ? (p.consumptionSource as ConsumptionSource)
      : "manual",
    driverRate: String(p.driverRate),
    baseFare: String(p.startupFee ?? p.baseFare),
    pricePerKm: String(p.pricePerKm),
    dailyRate: String(p.dailyRate),
    includedKm: String(p.dailyIncludedKm ?? p.includedKm),
    extraKmRate: String(p.extraKmRate),
    waitingHourlyRate: String(p.waitingHourlyRate ?? 0),
    depreciationPerKm: String(p.depreciationPerKm ?? 0),
    operatingCostPerKm: String(p.operatingCostPerKm ?? 0),
    minimumTripPrice: String(p.minimumTripPrice ?? 0),
    targetMarginPercent: String(Math.round(margin * 1000) / 10),
    priceRoundingUnit: String(p.priceRoundingUnit ?? 10_000),
    pricingStrategy: (PRICING_STRATEGIES as readonly string[]).includes(
      String(p.pricingStrategy ?? ""),
    )
      ? (p.pricingStrategy as PricingStrategy)
      : "PER_KM",
  };
}

function parseNonNegative(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function parsePositive(raw: string): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function formToVehiclePayload(form: VehicleFormState): Partial<Vehicle> {
  const imageUrl = form.imageUrl.trim();
  const imagePublicId = form.imagePublicId.trim();
  const features = form.features
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const suitableFor = form.suitableFor
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as Vehicle["suitableFor"];

  const city = parsePositive(form.consumptionCity);
  const highway = parsePositive(form.consumptionHighway);
  const mixed = parsePositive(form.consumptionMixed);
  const defaultConsumption =
    parsePositive(form.defaultConsumption) ?? mixed ?? city ?? highway;
  const fuelConsumption =
    city != null && highway != null && mixed != null
      ? { city, highway, mixed }
      : undefined;

  const startupFee = parseNonNegative(form.baseFare);
  const includedKm = parseNonNegative(form.includedKm);
  const marginPct = Number(form.targetMarginPercent);
  const targetMargin =
    Number.isFinite(marginPct) && marginPct >= 0 && marginPct < 100
      ? marginPct / 100
      : DEFAULT_VEHICLE_PRICING.targetMargin;

  return {
    name: form.name.trim(),
    brand: form.brand.trim(),
    model: form.model.trim(),
    licensePlate: form.licensePlate.trim(),
    seats: Number(form.seats) || 4,
    transmission: form.transmission.trim(),
    fuel: form.fuel.trim(),
    status: form.status,
    active: form.active,
    images: imageUrl ? [imageUrl] : [],
    imagePublicIds: imagePublicId ? [imagePublicId] : [],
    features: features.length > 0 ? features : ["Xe riêng + tài xế"],
    suitableFor: suitableFor.length > 0 ? suitableFor : ["travel"],
    pricing: {
      fuelType: form.fuelType || undefined,
      fuelConsumption,
      defaultConsumption,
      consumptionSource: form.consumptionSource || undefined,
      consumptionUpdatedAt: new Date().toISOString(),
      fuelConsumptionPer100Km: defaultConsumption ?? 0,
      fuelPricePerLiter: 0,
      driverRate: parseNonNegative(form.driverRate),
      baseFare: startupFee,
      startupFee,
      pricePerKm: parseNonNegative(form.pricePerKm),
      dailyRate: parseNonNegative(form.dailyRate),
      includedKm,
      dailyIncludedKm: includedKm,
      extraKmRate: parseNonNegative(form.extraKmRate),
      waitingHourlyRate: parseNonNegative(form.waitingHourlyRate),
      depreciationPerKm: parseNonNegative(form.depreciationPerKm),
      operatingCostPerKm: parseNonNegative(form.operatingCostPerKm),
      minimumTripPrice: parseNonNegative(form.minimumTripPrice),
      targetMargin,
      priceRoundingUnit: parseNonNegative(form.priceRoundingUnit) || 10_000,
      pricingStrategy: form.pricingStrategy || "PER_KM",
    },
  };
}

import {
  isConsumptionSource,
  isPriceRoundingUnit,
  isPricingStrategy,
  isVehicleFuelType,
  type VehiclePricingConfig,
} from "./vehicle-pricing.js";

/** Validate optional fuel + v2 pricing fields on vehicle create/update. */
export function validateVehicleFuelPricingInput(
  pricing?: Partial<VehiclePricingConfig> | null,
): { ok: true } | { ok: false; error: string } {
  if (!pricing) return { ok: true };

  if (pricing.fuelType != null && String(pricing.fuelType).trim()) {
    if (!isVehicleFuelType(String(pricing.fuelType).trim())) {
      return {
        ok: false,
        error: "Loại nhiên liệu không hợp lệ (chọn mã PVOIL).",
      };
    }
  }

  if (
    pricing.consumptionSource != null &&
    String(pricing.consumptionSource).trim() &&
    !isConsumptionSource(pricing.consumptionSource)
  ) {
    return { ok: false, error: "Nguồn tiêu hao không hợp lệ." };
  }

  if (
    pricing.pricingStrategy != null &&
    String(pricing.pricingStrategy).trim() &&
    !isPricingStrategy(pricing.pricingStrategy)
  ) {
    return { ok: false, error: "Chiến lược giá không hợp lệ." };
  }

  if (
    pricing.priceRoundingUnit != null &&
    !isPriceRoundingUnit(pricing.priceRoundingUnit)
  ) {
    return {
      ok: false,
      error: "Đơn vị làm tròn giá phải là 1.000 / 5.000 / 10.000 / 50.000.",
    };
  }

  if (pricing.targetMargin != null && pricing.targetMargin !== ("" as never)) {
    const m = Number(pricing.targetMargin);
    if (!Number.isFinite(m) || m < 0 || m >= 1) {
      return {
        ok: false,
        error: "Target margin phải từ 0 đến dưới 1 (ví dụ 0.30 = 30%).",
      };
    }
  }

  const checkPositive = (label: string, n: unknown): string | null => {
    if (n == null || n === "") return null;
    const v = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(v) || Number.isNaN(v)) {
      return `${label} không hợp lệ.`;
    }
    if (v <= 0) return `${label} phải lớn hơn 0.`;
    return null;
  };

  const checkNonNegative = (label: string, n: unknown): string | null => {
    if (n == null || n === "") return null;
    const v = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(v) || Number.isNaN(v)) {
      return `${label} không hợp lệ.`;
    }
    if (v < 0) return `${label} không được âm.`;
    return null;
  };

  for (const [label, val] of [
    ["Tiêu hao đô thị", pricing.fuelConsumption?.city],
    ["Tiêu hao đường trường", pricing.fuelConsumption?.highway],
    ["Tiêu hao hỗn hợp", pricing.fuelConsumption?.mixed],
    ["Tiêu hao mặc định", pricing.defaultConsumption],
    ["Tiêu hao (legacy)", pricing.fuelConsumptionPer100Km],
  ] as const) {
    if (val == null || val === ("" as never)) continue;
    if (label === "Tiêu hao (legacy)" && Number(val) === 0) continue;
    const err = checkPositive(label, val);
    if (err) return { ok: false, error: err };
  }

  for (const [label, val] of [
    ["Khấu hao / km", pricing.depreciationPerKm],
    ["Chi phí vận hành / km", pricing.operatingCostPerKm],
    ["Phí chờ / giờ", pricing.waitingHourlyRate],
    ["Giá tối thiểu", pricing.minimumTripPrice],
    ["Phí khởi hành", pricing.startupFee],
  ] as const) {
    const err = checkNonNegative(label, val);
    if (err) return { ok: false, error: err };
  }

  const rates = pricing.fuelConsumption;
  if (rates) {
    const keys = ["city", "highway", "mixed"] as const;
    const present = keys.filter(
      (k) => rates[k] != null && rates[k] !== ("" as never),
    );
    if (present.length > 0 && present.length < 3) {
      return {
        ok: false,
        error: "Cần nhập đủ tiêu hao đô thị, đường trường và hỗn hợp.",
      };
    }
  }

  return { ok: true };
}

import { FuelPriceError } from "./errors.js";
import { REQUIRED_FUEL_CODES } from "./normalize.js";
import type { FuelPriceProduct } from "./types.js";

const MIN_PRICE = 1;
const MAX_PRICE = 100_000;

export function validateFuelProducts(
  products: FuelPriceProduct[],
  effectiveAt: string,
): void {
  if (!effectiveAt) {
    throw new FuelPriceError("PVOIL_VALIDATION_FAILED", "Thiếu effectiveAt");
  }
  if (!products.length) {
    throw new FuelPriceError("PVOIL_VALIDATION_FAILED", "Không có sản phẩm");
  }

  const codes = new Set<string>();
  for (const p of products) {
    if (!p.name?.trim()) {
      throw new FuelPriceError("PVOIL_VALIDATION_FAILED", "Tên sản phẩm trống");
    }
    if (!Number.isInteger(p.price) || p.price < MIN_PRICE || p.price >= MAX_PRICE) {
      throw new FuelPriceError(
        "PVOIL_VALIDATION_FAILED",
        `Giá không hợp lệ: ${p.name}`,
      );
    }
    if (p.change != null && !Number.isInteger(p.change)) {
      throw new FuelPriceError(
        "PVOIL_VALIDATION_FAILED",
        `Chênh lệch không hợp lệ: ${p.name}`,
      );
    }
    const key = String(p.code);
    if (codes.has(key) && key !== "UNKNOWN") {
      throw new FuelPriceError(
        "PVOIL_VALIDATION_FAILED",
        `Trùng mã sản phẩm: ${key}`,
      );
    }
    codes.add(key);
  }

  for (const required of REQUIRED_FUEL_CODES) {
    const hit = products.find((p) => p.code === required && !p.unknown);
    if (!hit) {
      throw new FuelPriceError(
        "PVOIL_VALIDATION_FAILED",
        `Thiếu sản phẩm bắt buộc: ${required}`,
      );
    }
  }
}

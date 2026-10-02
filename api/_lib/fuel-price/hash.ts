import { createHash } from "node:crypto";
import type { FuelPriceProduct, FuelPriceSource } from "./types.js";

/** Deterministic hash for duplicate detection (provider + effectiveAt + prices). */
export function computeFuelPriceRawHash(params: {
  provider: FuelPriceSource;
  effectiveAt: string;
  products: FuelPriceProduct[];
}): string {
  const rows = [...params.products]
    .map((p) => ({
      code: String(p.code),
      name: p.name,
      region1Price: p.region1Price ?? p.price,
      region2Price: p.region2Price ?? null,
      price: p.price,
    }))
    .sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));

  const payload = JSON.stringify({
    provider: params.provider,
    effectiveAt: params.effectiveAt,
    products: rows,
  });
  return createHash("sha256").update(payload).digest("hex");
}

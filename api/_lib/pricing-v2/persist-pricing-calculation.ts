import { randomUUID } from "node:crypto";
import { pricingCalculationsCol } from "../mongo.js";
import type { PricingV2EngineResult } from "../../../shared/ride/pricing-v2/pricing.types.js";

export type PricingCalculationDoc = {
  _id: string;
  id: string;
  bookingId?: string | null;
  vehicleId: string;
  pricingEngineVersion: "v2";
  result: PricingV2EngineResult;
  calculationInputs: Record<string, unknown>;
  createdAt: string;
};

export async function persistPricingCalculation(params: {
  vehicleId: string;
  bookingId?: string | null;
  result: PricingV2EngineResult;
}): Promise<PricingCalculationDoc> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const doc: PricingCalculationDoc = {
    _id: id,
    id,
    bookingId: params.bookingId ?? null,
    vehicleId: params.vehicleId,
    pricingEngineVersion: "v2",
    result: params.result,
    calculationInputs: params.result.calculationInputs,
    createdAt: now,
  };
  const col = await pricingCalculationsCol();
  await col.insertOne(doc);
  return doc;
}

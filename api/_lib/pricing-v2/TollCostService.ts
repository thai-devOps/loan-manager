import type { TollItem } from "../../../shared/ride/pricing-v2/pricing.types.js";
import { calculateTollCostV2 } from "../../../shared/ride/pricing-v2/toll-cost.js";

/** Version 1: manual toll items only; interface ready for toll API later. */
export function resolveTollCost(params: {
  manuallyAddedTolls?: TollItem[] | null;
}): ReturnType<typeof calculateTollCostV2> {
  return calculateTollCostV2(params.manuallyAddedTolls);
}

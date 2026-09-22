import type { GoldMarketPrice, GoldPricesLatestResponse } from "@/api/endpoints";
import type { AssetSettings, GoldType } from "@/types/assets";
import { defaultReferenceSourceCode } from "@/features/assets/lib/gold-plan-metrics";
import { phanToChi } from "@/features/assets/lib/gold-units";

export type GoldPriceMap = AssetSettings["goldReferencePricePerChi"];

export function resolveReferenceBuyPrice(params: {
  goldType: GoldType | null | undefined;
  referenceSourceCode?: string | null;
  market: GoldPricesLatestResponse | null | undefined;
  fallbackPricePerChi: number;
}): {
  pricePerChi: number;
  marketPrice: GoldMarketPrice | null;
  fromMarket: boolean;
} {
  const code =
    params.referenceSourceCode?.trim() ||
    defaultReferenceSourceCode(params.goldType ?? null);
  const prices = params.market?.prices ?? [];
  const hit = code
    ? prices.find((p) => p.sourceCode.toUpperCase() === code.toUpperCase())
    : undefined;
  if (hit?.buyPricePerChi != null && hit.buyPricePerChi > 0) {
    return {
      pricePerChi: hit.buyPricePerChi,
      marketPrice: hit,
      fromMarket: true,
    };
  }
  return {
    pricePerChi: params.fallbackPricePerChi > 0 ? params.fallbackPricePerChi : 0,
    marketPrice: hit ?? null,
    fromMarket: false,
  };
}

/** Merge PNJ latest buy prices into the settings map (9999←N24K, 18k←75). */
export function buildGoldPriceMapFromMarket(
  fallback: GoldPriceMap,
  market: GoldPricesLatestResponse | null | undefined,
): { prices: GoldPriceMap; anyFromMarket: boolean } {
  const types: GoldType[] = ["9999", "18k", "other"];
  const prices: GoldPriceMap = { ...fallback };
  let anyFromMarket = false;
  for (const type of types) {
    const resolved = resolveReferenceBuyPrice({
      goldType: type,
      market,
      fallbackPricePerChi: fallback[type] ?? 0,
    });
    prices[type] = resolved.pricePerChi;
    if (resolved.fromMarket) anyFromMarket = true;
  }
  return { prices, anyFromMarket };
}

export function estimateGoldValueByType(
  quantityByType: Record<GoldType, number>,
  prices: GoldPriceMap,
): number {
  return (
    Math.round(phanToChi(quantityByType["9999"] ?? 0) * (prices["9999"] ?? 0)) +
    Math.round(phanToChi(quantityByType["18k"] ?? 0) * (prices["18k"] ?? 0)) +
    Math.round(phanToChi(quantityByType.other ?? 0) * (prices.other ?? 0))
  );
}

/** Current market value of one purchase (does not mutate purchasePricePerChi). */
export function estimatePurchaseMarketValue(
  quantityInPhan: number,
  pricePerChi: number,
): number {
  if (!(pricePerChi > 0) || !(quantityInPhan > 0)) return 0;
  return Math.round(phanToChi(quantityInPhan) * pricePerChi);
}

/** Resolve live buy price for a purchase: prefer sourceCode, else type map. */
export function resolvePurchaseBuyPrice(params: {
  sourceCode?: string | null;
  type: GoldType;
  market: GoldPricesLatestResponse | null | undefined;
  fallbackPrices: GoldPriceMap;
}): number {
  const code = params.sourceCode?.trim();
  if (code) {
    const hit = params.market?.prices.find(
      (p) => p.sourceCode.toUpperCase() === code.toUpperCase(),
    );
    if (hit?.buyPricePerChi != null && hit.buyPricePerChi > 0) {
      return hit.buyPricePerChi;
    }
  }
  const mapped = resolveReferenceBuyPrice({
    goldType: params.type,
    market: params.market,
    fallbackPricePerChi: params.fallbackPrices[params.type] ?? 0,
  });
  return mapped.pricePerChi;
}

export function estimatePurchasesMarketValue(
  purchases: Array<{
    quantityInPhan: number;
    type: GoldType;
    sourceCode?: string | null;
    totalCost: number;
  }>,
  market: GoldPricesLatestResponse | null | undefined,
  fallbackPrices: GoldPriceMap,
): { goldValue: number; goldDifference: number } {
  let goldValue = 0;
  let goldCost = 0;
  for (const p of purchases) {
    const price = resolvePurchaseBuyPrice({
      sourceCode: p.sourceCode,
      type: p.type,
      market,
      fallbackPrices,
    });
    goldValue += estimatePurchaseMarketValue(p.quantityInPhan, price);
    goldCost += p.totalCost;
  }
  return { goldValue, goldDifference: goldValue - goldCost };
}

export function formatBranchLabel(branch: string): string {
  const map: Record<string, string> = {
    hochiminh: "Hồ Chí Minh",
    hanoi: "Hà Nội",
    danang: "Đà Nẵng",
  };
  return map[branch.toLowerCase()] ?? branch;
}

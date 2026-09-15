import type { AssetSettings, GoldType } from "@/types/assets";

/**
 * Abstraction over gold reference prices.
 * Currently backed by manual AssetSettings; replace implementation later
 * for an external feed without changing call sites.
 */
export type GoldPriceMap = AssetSettings["goldReferencePricePerChi"];

export function createGoldPriceService(prices: GoldPriceMap) {
  return {
    getCurrentGoldPrice(type: GoldType): number {
      return prices[type] ?? 0;
    },
    getAllCurrentPrices(): GoldPriceMap {
      return { ...prices };
    },
    /**
     * Reserved for future market history integration.
     * Not available with the current manual reference-price source.
     */
    getGoldPriceHistory(): never {
      throw new Error(
        "Lịch sử giá vàng chưa được tích hợp. Hiện chỉ hỗ trợ giá tham chiếu thủ công.",
      );
    },
  };
}

export type GoldPriceService = ReturnType<typeof createGoldPriceService>;

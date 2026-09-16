import type { PriceQuote } from "@/features/ride/types/ride";
import { MOCK_PRICING } from "@/features/ride/data/mock-pricing";

/** MVP: no pricing engine — never invent amounts. */
export const pricingService = {
  async getQuote(_params?: {
    serviceType?: string;
    tripType?: string;
    vehicleId?: string;
  }): Promise<PriceQuote> {
    return {
      display: "Liên hệ báo giá",
      amount: null,
    };
  },

  async getReferencePricing() {
    return MOCK_PRICING;
  },
};

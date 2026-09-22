import type { GoldPriceProvider, GoldPriceResult } from "./types.js";
import { normalizePnjResponse, validatePnjResponse } from "./normalize.js";

const PNJ_API_BASE =
  "https://edge-cf-api.pnj.io/ecom-frontend/v1/get-gold-price";

export function getPnjZone(override?: string): string {
  const fromEnv = (process.env.PNJ_ZONE ?? "00").trim() || "00";
  const zone = (override?.trim() || fromEnv).trim();
  return zone || "00";
}

export class PnjGoldPriceProvider implements GoldPriceProvider {
  async getPrices(options?: { zone?: string }): Promise<GoldPriceResult> {
    const zone = getPnjZone(options?.zone);
    const url = new URL(PNJ_API_BASE);
    url.searchParams.set("zone", zone);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "MonelyGoldPriceSync/1.0",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`PNJ HTTP ${res.status}`);
      }

      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new Error("PNJ trả JSON không hợp lệ");
      }

      const validated = validatePnjResponse(json);
      return normalizePnjResponse(validated, zone);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("PNJ timeout");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createDefaultGoldPriceProvider(): GoldPriceProvider {
  return new PnjGoldPriceProvider();
}

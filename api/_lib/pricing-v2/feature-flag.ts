/** Feature flag: Pricing Engine v2 (default off). */
export function isPricingEngineV2Enabled(): boolean {
  const raw = (process.env.PRICING_ENGINE_V2 ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

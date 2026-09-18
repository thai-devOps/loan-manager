/** Customer-facing pricing engine (not operating cost). */

export type PricingRuleType =
  | "ROUTE"
  | "PER_KM"
  | "PER_DAY"
  | "AIRPORT"
  | "SURCHARGE";

export type PricingRuleStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type VehicleCategory = "SEAT_4" | "SEAT_7" | "SEAT_16" | "ANY";

export type PricingServiceMatch =
  | "TRAVEL"
  | "MEDICAL"
  | "PILGRIMAGE"
  | "AIRPORT"
  | "BUSINESS"
  | "CUSTOM"
  | "ANY";

export type PricingRuleConfig = {
  basePrice?: number;
  pricePerKm?: number;
  minimumPrice?: number;
  pricePerDay?: number;
  overtimePricePerHour?: number;
  roundTrip?: boolean;
  surchargeType?: "fixed" | "percentage";
  surchargeAmount?: number;
  surchargePercentage?: number;
};

export type PricingRuleLike = {
  id: string;
  name?: string;
  type: PricingRuleType;
  serviceType: PricingServiceMatch;
  vehicleCategory: VehicleCategory;
  originKey?: string;
  destinationKey?: string;
  pricingConfig: PricingRuleConfig;
  priority: number;
  status: PricingRuleStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
};

export type CalculatePriceInput = {
  serviceType: PricingServiceMatch;
  vehicleCategory: VehicleCategory;
  originKey?: string;
  destinationKey?: string;
  distanceKm: number;
  roundTrip: boolean;
  date: string;
  /** Hours beyond included day for PER_DAY overtime (optional). */
  overtimeHours?: number;
};

export type PriceBreakdown = {
  basePrice: number;
  distancePrice: number;
  surcharges: number;
  total: number;
};

export type CalculatePriceResult =
  | {
      ok: true;
      matchedRuleId: string;
      matchedRuleName?: string;
      version: number;
      billableKm: number;
      breakdown: PriceBreakdown;
      surchargeRuleIds: string[];
    }
  | {
      ok: false;
      code: "NO_PRICING_RULE_FOUND";
      message: string;
    };

function roundMoney(n: number): number {
  return Math.round(n);
}

export function normalizeLocationKey(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function seatsToVehicleCategory(seats: number): VehicleCategory {
  const n = Number(seats) || 0;
  if (n <= 4) return "SEAT_4";
  if (n <= 7) return "SEAT_7";
  return "SEAT_16";
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function isRuleEffectiveOn(
  rule: Pick<PricingRuleLike, "status" | "effectiveFrom" | "effectiveTo">,
  date: string,
): boolean {
  if (rule.status !== "ACTIVE") return false;
  const d = dateOnly(date);
  const from = dateOnly(rule.effectiveFrom || d);
  if (d < from) return false;
  if (rule.effectiveTo) {
    const to = dateOnly(rule.effectiveTo);
    if (d > to) return false;
  }
  return true;
}

function serviceMatches(
  ruleService: PricingServiceMatch,
  input: PricingServiceMatch,
): boolean {
  return ruleService === "ANY" || ruleService === input;
}

function vehicleMatches(
  ruleCat: VehicleCategory,
  input: VehicleCategory,
): boolean {
  return ruleCat === "ANY" || ruleCat === input;
}

function hasRoute(rule: PricingRuleLike): boolean {
  return Boolean(rule.originKey && rule.destinationKey);
}

function routeMatches(rule: PricingRuleLike, input: CalculatePriceInput): boolean {
  if (!hasRoute(rule)) return false;
  return (
    rule.originKey === (input.originKey || "") &&
    rule.destinationKey === (input.destinationKey || "")
  );
}

/** Match tier 1..5 (lower = better). Returns null if no match. */
export function matchTier(
  rule: PricingRuleLike,
  input: CalculatePriceInput,
): number | null {
  if (!isRuleEffectiveOn(rule, input.date)) return null;
  if (rule.type === "SURCHARGE") return null;

  const svc = serviceMatches(rule.serviceType, input.serviceType);
  const veh = vehicleMatches(rule.vehicleCategory, input.vehicleCategory);
  if (!svc) return null;

  if (hasRoute(rule)) {
    if (!routeMatches(rule, input)) return null;
    if (veh) return 1;
    if (rule.vehicleCategory === "ANY") return 2;
    return null;
  }

  if (veh && rule.serviceType !== "ANY") return 3;
  if (rule.serviceType !== "ANY" && rule.vehicleCategory === "ANY") return 4;
  if (
    rule.type === "PER_KM" &&
    rule.serviceType === "ANY" &&
    rule.vehicleCategory === "ANY"
  ) {
    return 5;
  }
  if (veh && rule.serviceType === "ANY") return 4;
  return null;
}

function pickBestRule(
  rules: PricingRuleLike[],
  input: CalculatePriceInput,
): PricingRuleLike | null {
  let best: PricingRuleLike | null = null;
  let bestTier = 99;
  for (const rule of rules) {
    const tier = matchTier(rule, input);
    if (tier == null) continue;
    if (
      !best ||
      tier < bestTier ||
      (tier === bestTier && rule.priority > best.priority) ||
      (tier === bestTier &&
        rule.priority === best.priority &&
        rule.version > best.version)
    ) {
      best = rule;
      bestTier = tier;
    }
  }
  return best;
}

function computeFare(
  rule: PricingRuleLike,
  input: CalculatePriceInput,
): {
  basePrice: number;
  distancePrice: number;
  billableKm: number;
  totalBeforeSurcharge: number;
} {
  const cfg = rule.pricingConfig || {};
  const oneWayKm = Math.max(0, Number(input.distanceKm) || 0);
  const useRound = Boolean(input.roundTrip || cfg.roundTrip);
  const billableKm = useRound ? oneWayKm * 2 : oneWayKm;

  if (rule.type === "PER_DAY") {
    const basePrice = roundMoney(Math.max(0, Number(cfg.pricePerDay) || 0));
    const overtime = Math.max(0, Number(input.overtimeHours) || 0);
    const otRate = Math.max(0, Number(cfg.overtimePricePerHour) || 0);
    const distancePrice = roundMoney(overtime * otRate);
    return {
      basePrice,
      distancePrice,
      billableKm,
      totalBeforeSurcharge: basePrice + distancePrice,
    };
  }

  const basePrice = roundMoney(Math.max(0, Number(cfg.basePrice) || 0));
  const perKm = Math.max(0, Number(cfg.pricePerKm) || 0);
  const distancePrice = roundMoney(billableKm * perKm);
  let total = basePrice + distancePrice;
  const minimum = Number(cfg.minimumPrice);
  if (Number.isFinite(minimum) && minimum > total) {
    total = roundMoney(minimum);
  }
  return {
    basePrice,
    distancePrice,
    billableKm,
    totalBeforeSurcharge: total,
  };
}

function computeSurchargeAmount(
  rule: PricingRuleLike,
  subtotal: number,
): number {
  const cfg = rule.pricingConfig || {};
  if (cfg.surchargeType === "percentage") {
    const pct = Math.max(0, Number(cfg.surchargePercentage) || 0);
    return roundMoney((subtotal * pct) / 100);
  }
  return roundMoney(Math.max(0, Number(cfg.surchargeAmount) || 0));
}

export function calculateCustomerPrice(
  rules: PricingRuleLike[],
  input: CalculatePriceInput,
): CalculatePriceResult {
  const primary = pickBestRule(rules, input);
  if (!primary) {
    return {
      ok: false,
      code: "NO_PRICING_RULE_FOUND",
      message: "Không tìm thấy bảng giá phù hợp cho chuyến này.",
    };
  }

  const fare = computeFare(primary, input);
  const surchargeRules = rules
    .filter(
      (r) =>
        r.type === "SURCHARGE" &&
        isRuleEffectiveOn(r, input.date) &&
        serviceMatches(r.serviceType, input.serviceType) &&
        vehicleMatches(r.vehicleCategory, input.vehicleCategory),
    )
    .sort((a, b) => b.priority - a.priority || b.version - a.version);

  let surcharges = 0;
  const surchargeRuleIds: string[] = [];
  for (const s of surchargeRules) {
    const amt = computeSurchargeAmount(s, fare.totalBeforeSurcharge);
    if (amt > 0) {
      surcharges += amt;
      surchargeRuleIds.push(s.id);
    }
  }
  surcharges = roundMoney(surcharges);
  const total = roundMoney(fare.totalBeforeSurcharge + surcharges);

  return {
    ok: true,
    matchedRuleId: primary.id,
    matchedRuleName: primary.name,
    version: primary.version,
    billableKm: fare.billableKm,
    breakdown: {
      basePrice: fare.basePrice,
      distancePrice: fare.distancePrice,
      surcharges,
      total,
    },
    surchargeRuleIds,
  };
}

export function validatePricingConfig(
  type: PricingRuleType,
  config: PricingRuleConfig,
): string | null {
  const n = (v: unknown) => (v == null || v === "" ? null : Number(v));
  const checkNonNeg = (v: number | null, label: string) => {
    if (v == null) return null;
    if (!Number.isFinite(v) || v < 0) return `${label} không hợp lệ`;
    return null;
  };

  if (type === "ROUTE" || type === "PER_KM" || type === "AIRPORT") {
    const err =
      checkNonNeg(n(config.basePrice), "Giá cơ bản") ||
      checkNonNeg(n(config.pricePerKm), "Giá/km") ||
      checkNonNeg(n(config.minimumPrice), "Giá tối thiểu");
    if (err) return err;
  }
  if (type === "PER_DAY") {
    const err =
      checkNonNeg(n(config.pricePerDay), "Giá/ngày") ||
      checkNonNeg(n(config.overtimePricePerHour), "Giá giờ vượt");
    if (err) return err;
    if (n(config.pricePerDay) == null) return "Vui lòng nhập giá/ngày";
  }
  if (type === "SURCHARGE") {
    if (config.surchargeType === "percentage") {
      const err = checkNonNeg(n(config.surchargePercentage), "Phần trăm phụ phí");
      if (err) return err;
    } else {
      const err = checkNonNeg(n(config.surchargeAmount), "Phụ phí");
      if (err) return err;
    }
  }
  return null;
}

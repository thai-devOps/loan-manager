import { randomUUID } from "node:crypto";
import type {
  BookingPricingSnapshot,
  PricingRuleConfig,
  PricingRuleStatus,
  PricingRuleType,
  PricingServiceMatch,
  RidePricingRule,
  VehicleCategory,
} from "./ride-types.js";
import { ridePricingRulesCol, stripDoc } from "./mongo.js";
import {
  calculateCustomerPrice,
  normalizeLocationKey,
  seatsToVehicleCategory,
  validatePricingConfig,
  isRuleEffectiveOn,
  type CalculatePriceInput,
  type CalculatePriceResult,
  type PricingRuleLike,
} from "../../shared/ride/pricing-engine.js";

export {
  normalizeLocationKey,
  seatsToVehicleCategory,
  validatePricingConfig,
  calculateCustomerPrice,
};

export function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function listPricingRules(filters?: {
  type?: string;
  status?: string;
  q?: string;
}): Promise<RidePricingRule[]> {
  const col = await ridePricingRulesCol();
  const query: Record<string, unknown> = {};
  if (filters?.type) query.type = filters.type;
  if (filters?.status) query.status = filters.status;
  if (filters?.q) {
    const q = filters.q.trim();
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { origin: { $regex: q, $options: "i" } },
        { destination: { $regex: q, $options: "i" } },
      ];
    }
  }
  const rows = await col.find(query).sort({ updatedAt: -1 }).toArray();
  return rows.map((r) => stripDoc(r) as RidePricingRule);
}

export async function getPricingRule(
  id: string,
): Promise<RidePricingRule | null> {
  const col = await ridePricingRulesCol();
  const row = await col.findOne({ id });
  return row ? (stripDoc(row) as RidePricingRule) : null;
}

export type CreatePricingRuleInput = {
  name: string;
  type: PricingRuleType;
  serviceType?: PricingServiceMatch;
  vehicleCategory?: VehicleCategory;
  origin?: string;
  destination?: string;
  pricingConfig: PricingRuleConfig;
  priority?: number;
  status?: PricingRuleStatus;
  effectiveFrom?: string;
  effectiveTo?: string | null;
};

export function normalizeRuleFields(input: CreatePricingRuleInput): {
  name: string;
  type: PricingRuleType;
  serviceType: PricingServiceMatch;
  vehicleCategory: VehicleCategory;
  origin?: string;
  destination?: string;
  originKey?: string;
  destinationKey?: string;
  pricingConfig: PricingRuleConfig;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
} {
  const name = String(input.name ?? "").trim();
  const type = input.type;
  const origin = input.origin?.trim() || undefined;
  const destination = input.destination?.trim() || undefined;
  return {
    name,
    type,
    serviceType: input.serviceType || "ANY",
    vehicleCategory: input.vehicleCategory || "ANY",
    origin,
    destination,
    originKey: origin ? normalizeLocationKey(origin) : undefined,
    destinationKey: destination ? normalizeLocationKey(destination) : undefined,
    pricingConfig: input.pricingConfig || {},
    priority: Number(input.priority) || 0,
    effectiveFrom: (input.effectiveFrom || todayIsoDate()).slice(0, 10),
    effectiveTo: input.effectiveTo
      ? String(input.effectiveTo).slice(0, 10)
      : null,
  };
}

export async function createPricingRule(
  input: CreatePricingRuleInput,
): Promise<RidePricingRule> {
  const fields = normalizeRuleFields(input);
  if (!fields.name) throw new Error("Vui lòng nhập tên bảng giá");
  const cfgErr = validatePricingConfig(fields.type, fields.pricingConfig);
  if (cfgErr) throw new Error(cfgErr);
  if (
    fields.effectiveTo &&
    fields.effectiveTo < fields.effectiveFrom
  ) {
    throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
  }
  if (
    (fields.type === "ROUTE" || fields.type === "AIRPORT") &&
    (!fields.originKey || !fields.destinationKey)
  ) {
    throw new Error("Tuyến cần điểm đón và điểm đến");
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const rule: RidePricingRule = {
    _id: id,
    id,
    ...fields,
    status: input.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
    version: 1,
    versionHistory: [],
    createdAt: now,
    updatedAt: now,
  };
  const col = await ridePricingRulesCol();
  await col.insertOne(rule);
  return stripDoc(rule) as RidePricingRule;
}

export async function updatePricingRule(
  id: string,
  input: Partial<CreatePricingRuleInput> & { bumpVersion?: boolean },
): Promise<RidePricingRule> {
  const col = await ridePricingRulesCol();
  const current = await col.findOne({ id });
  if (!current) throw new Error("Không tìm thấy bảng giá");

  const merged = normalizeRuleFields({
    name: input.name ?? current.name,
    type: (input.type ?? current.type) as PricingRuleType,
    serviceType: input.serviceType ?? current.serviceType,
    vehicleCategory: input.vehicleCategory ?? current.vehicleCategory,
    origin: input.origin !== undefined ? input.origin : current.origin,
    destination:
      input.destination !== undefined ? input.destination : current.destination,
    pricingConfig: input.pricingConfig ?? current.pricingConfig,
    priority: input.priority ?? current.priority,
    effectiveFrom: input.effectiveFrom ?? current.effectiveFrom,
    effectiveTo:
      input.effectiveTo !== undefined
        ? input.effectiveTo
        : current.effectiveTo,
  });

  if (!merged.name) throw new Error("Vui lòng nhập tên bảng giá");
  const cfgErr = validatePricingConfig(merged.type, merged.pricingConfig);
  if (cfgErr) throw new Error(cfgErr);
  if (merged.effectiveTo && merged.effectiveTo < merged.effectiveFrom) {
    throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
  }

  const now = new Date().toISOString();
  const configChanged =
    JSON.stringify(merged.pricingConfig) !==
    JSON.stringify(current.pricingConfig);
  const shouldBump =
    current.status === "ACTIVE" &&
    (input.bumpVersion === true || configChanged);

  const patch: Record<string, unknown> = {
    ...merged,
    updatedAt: now,
  };

  if (shouldBump) {
    patch.version = current.version + 1;
    patch.versionHistory = [
      ...(current.versionHistory ?? []),
      {
        version: current.version,
        pricingConfig: current.pricingConfig,
        archivedAt: now,
      },
    ];
  }

  const result = await col.findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" },
  );
  return stripDoc(result!) as RidePricingRule;
}

export async function publishPricingRule(id: string): Promise<RidePricingRule> {
  const col = await ridePricingRulesCol();
  const current = await col.findOne({ id });
  if (!current) throw new Error("Không tìm thấy bảng giá");
  if (current.status === "ARCHIVED") {
    throw new Error("Không thể publish bảng giá đã lưu trữ");
  }
  const cfgErr = validatePricingConfig(current.type, current.pricingConfig);
  if (cfgErr) throw new Error(cfgErr);
  const now = new Date().toISOString();
  const result = await col.findOneAndUpdate(
    { id },
    { $set: { status: "ACTIVE", updatedAt: now } },
    { returnDocument: "after" },
  );
  return stripDoc(result!) as RidePricingRule;
}

export async function archivePricingRule(id: string): Promise<RidePricingRule> {
  const col = await ridePricingRulesCol();
  const current = await col.findOne({ id });
  if (!current) throw new Error("Không tìm thấy bảng giá");
  const now = new Date().toISOString();
  const result = await col.findOneAndUpdate(
    { id },
    { $set: { status: "ARCHIVED", updatedAt: now } },
    { returnDocument: "after" },
  );
  return stripDoc(result!) as RidePricingRule;
}

export async function unpublishPricingRule(
  id: string,
): Promise<RidePricingRule> {
  const col = await ridePricingRulesCol();
  const current = await col.findOne({ id });
  if (!current) throw new Error("Không tìm thấy bảng giá");
  if (current.status !== "ACTIVE") {
    throw new Error("Chỉ có thể gỡ publish bảng giá đang ACTIVE");
  }
  const now = new Date().toISOString();
  const result = await col.findOneAndUpdate(
    { id },
    { $set: { status: "DRAFT", updatedAt: now } },
    { returnDocument: "after" },
  );
  return stripDoc(result!) as RidePricingRule;
}

export async function restorePricingRule(id: string): Promise<RidePricingRule> {
  const col = await ridePricingRulesCol();
  const current = await col.findOne({ id });
  if (!current) throw new Error("Không tìm thấy bảng giá");
  if (current.status !== "ARCHIVED") {
    throw new Error("Chỉ có thể khôi phục bảng giá đã lưu trữ");
  }
  const now = new Date().toISOString();
  const result = await col.findOneAndUpdate(
    { id },
    { $set: { status: "DRAFT", updatedAt: now } },
    { returnDocument: "after" },
  );
  return stripDoc(result!) as RidePricingRule;
}

export async function deletePricingRule(id: string): Promise<void> {
  const col = await ridePricingRulesCol();
  const result = await col.deleteOne({ id });
  if (result.deletedCount === 0) {
    throw new Error("Không tìm thấy bảng giá");
  }
}

/** Public-safe ACTIVE ROUTE/AIRPORT rules for the pricing page. */
export type PublicPricingRoute = {
  id: string;
  name: string;
  type: "ROUTE" | "AIRPORT";
  origin: string;
  destination: string;
  vehicleCategory: VehicleCategory;
  serviceType: PricingServiceMatch;
  pricingConfig: {
    basePrice: number;
    pricePerKm: number;
    minimumPrice?: number;
    roundTrip?: boolean;
  };
  priority: number;
};

export async function listPublicPricingRoutes(
  date?: string,
): Promise<PublicPricingRoute[]> {
  const col = await ridePricingRulesCol();
  const onDate = (date || todayIsoDate()).slice(0, 10);
  const rows = await col
    .find({
      status: "ACTIVE",
      type: { $in: ["ROUTE", "AIRPORT"] },
    })
    .toArray();

  const mapped = rows
    .filter((r) =>
      isRuleEffectiveOn(
        {
          status: r.status,
          effectiveFrom: r.effectiveFrom,
          effectiveTo: r.effectiveTo,
        },
        onDate,
      ),
    )
    .filter((r) => Boolean((r.origin ?? "").trim() && (r.destination ?? "").trim()))
    .map((r) => {
      const cfg = r.pricingConfig || {};
      return {
        id: r.id,
        name: r.name,
        type: r.type as "ROUTE" | "AIRPORT",
        origin: (r.origin ?? "").trim(),
        destination: (r.destination ?? "").trim(),
        vehicleCategory: r.vehicleCategory,
        serviceType: r.serviceType,
        pricingConfig: {
          basePrice: Math.max(0, Number(cfg.basePrice) || 0),
          pricePerKm: Math.max(0, Number(cfg.pricePerKm) || 0),
          minimumPrice:
            cfg.minimumPrice != null ? Number(cfg.minimumPrice) : undefined,
          roundTrip: cfg.roundTrip,
        },
        priority: r.priority ?? 0,
      } satisfies PublicPricingRoute;
    });

  mapped.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.origin.localeCompare(b.origin, "vi");
  });
  return mapped;
}

export async function duplicatePricingRule(
  id: string,
): Promise<RidePricingRule> {
  const current = await getPricingRule(id);
  if (!current) throw new Error("Không tìm thấy bảng giá");
  return createPricingRule({
    name: `${current.name} (bản sao)`,
    type: current.type,
    serviceType: current.serviceType,
    vehicleCategory: current.vehicleCategory,
    origin: current.origin,
    destination: current.destination,
    pricingConfig: { ...current.pricingConfig },
    priority: current.priority,
    status: "DRAFT",
    effectiveFrom: current.effectiveFrom,
    effectiveTo: current.effectiveTo,
  });
}

export async function runPricingCalculate(
  input: CalculatePriceInput,
): Promise<CalculatePriceResult & { snapshot?: BookingPricingSnapshot }> {
  const col = await ridePricingRulesCol();
  const candidates = await col
    .find({
      status: { $in: ["ACTIVE"] },
    })
    .toArray();
  const rules: PricingRuleLike[] = candidates.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    serviceType: r.serviceType,
    vehicleCategory: r.vehicleCategory,
    originKey: r.originKey,
    destinationKey: r.destinationKey,
    pricingConfig: r.pricingConfig,
    priority: r.priority,
    status: r.status,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    version: r.version,
  }));

  const result = calculateCustomerPrice(rules, {
    ...input,
    originKey: input.originKey
      ? normalizeLocationKey(input.originKey)
      : undefined,
    destinationKey: input.destinationKey
      ? normalizeLocationKey(input.destinationKey)
      : undefined,
  });

  if (!result.ok) return result;

  const snapshot: BookingPricingSnapshot = {
    pricingRuleId: result.matchedRuleId,
    version: result.version,
    calculatedAt: new Date().toISOString(),
    basePrice: result.breakdown.basePrice,
    distanceKm: result.billableKm,
    distancePrice: result.breakdown.distancePrice,
    surcharges: result.breakdown.surcharges,
    total: result.breakdown.total,
    originKey: input.originKey
      ? normalizeLocationKey(input.originKey)
      : undefined,
    destinationKey: input.destinationKey
      ? normalizeLocationKey(input.destinationKey)
      : undefined,
    vehicleCategory: input.vehicleCategory,
    serviceType: input.serviceType,
    roundTrip: input.roundTrip,
  };

  return { ...result, snapshot };
}

export async function pricingSummary() {
  const col = await ridePricingRulesCol();
  const all = await col.find({}).toArray();
  const today = todayIsoDate();
  let active = 0;
  let draft = 0;
  let expired = 0;
  for (const r of all) {
    if (r.status === "DRAFT") draft += 1;
    else if (r.status === "ACTIVE") {
      if (r.effectiveTo && r.effectiveTo < today) expired += 1;
      else active += 1;
    } else if (r.status === "ARCHIVED") {
      /* skip */
    }
  }
  return {
    total: all.length,
    active,
    draft,
    expired,
  };
}

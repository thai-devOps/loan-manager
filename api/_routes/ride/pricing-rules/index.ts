import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  createPricingRule,
  listPricingRules,
  pricingSummary,
} from "../../../_lib/ride-pricing.js";
import type {
  PricingRuleConfig,
  PricingRuleType,
  PricingServiceMatch,
  VehicleCategory,
} from "../../../_lib/ride-types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_VIEW))) {
        return;
      }
      const type =
        typeof req.query.type === "string" ? req.query.type : undefined;
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const [items, summary] = await Promise.all([
        listPricingRules({ type, status, q }),
        pricingSummary(),
      ]);
      res.status(200).json({ items, summary });
      return;
    }

    if (req.method === "POST") {
      if (
        !(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_CREATE))
      ) {
        return;
      }
      const body = readJsonBody<{
        name?: string;
        type?: PricingRuleType;
        serviceType?: PricingServiceMatch;
        vehicleCategory?: VehicleCategory;
        origin?: string;
        destination?: string;
        pricingConfig?: PricingRuleConfig;
        priority?: number;
        effectiveFrom?: string;
        effectiveTo?: string | null;
      }>(req);
      try {
        const rule = await createPricingRule({
          name: body.name ?? "",
          type: body.type ?? "PER_KM",
          serviceType: body.serviceType,
          vehicleCategory: body.vehicleCategory,
          origin: body.origin,
          destination: body.destination,
          pricingConfig: body.pricingConfig ?? {},
          priority: body.priority,
          effectiveFrom: body.effectiveFrom,
          effectiveTo: body.effectiveTo,
          status: "DRAFT",
        });
        res.status(201).json(rule);
      } catch (e) {
        res.status(400).json({
          error: e instanceof Error ? e.message : "Không tạo được bảng giá",
        });
      }
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

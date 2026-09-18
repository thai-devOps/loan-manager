import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  archivePricingRule,
  duplicatePricingRule,
  getPricingRule,
  publishPricingRule,
  updatePricingRule,
} from "../../../_lib/ride-pricing.js";
import type {
  PricingRuleConfig,
  PricingRuleType,
  PricingServiceMatch,
  VehicleCategory,
} from "../../../_lib/ride-types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_VIEW))) {
        return;
      }
      const rule = await getPricingRule(id);
      if (!rule) {
        res.status(404).json({ error: "Không tìm thấy bảng giá" });
        return;
      }
      res.status(200).json(rule);
      return;
    }

    if (req.method === "PATCH") {
      const body = readJsonBody<{
        action?: string;
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
      const action = (body.action ?? "").trim();

      try {
        if (action === "publish") {
          if (
            !(await requirePermission(
              req,
              res,
              PERMISSIONS.FLEET_PRICING_PUBLISH,
            ))
          ) {
            return;
          }
          res.status(200).json(await publishPricingRule(id));
          return;
        }
        if (action === "archive") {
          if (
            !(await requirePermission(
              req,
              res,
              PERMISSIONS.FLEET_PRICING_UPDATE,
            ))
          ) {
            return;
          }
          res.status(200).json(await archivePricingRule(id));
          return;
        }
        if (action === "duplicate") {
          if (
            !(await requirePermission(
              req,
              res,
              PERMISSIONS.FLEET_PRICING_CREATE,
            ))
          ) {
            return;
          }
          res.status(201).json(await duplicatePricingRule(id));
          return;
        }

        if (
          !(await requirePermission(req, res, PERMISSIONS.FLEET_PRICING_UPDATE))
        ) {
          return;
        }
        const updated = await updatePricingRule(id, {
          name: body.name,
          type: body.type,
          serviceType: body.serviceType,
          vehicleCategory: body.vehicleCategory,
          origin: body.origin,
          destination: body.destination,
          pricingConfig: body.pricingConfig,
          priority: body.priority,
          effectiveFrom: body.effectiveFrom,
          effectiveTo: body.effectiveTo,
        });
        res.status(200).json(updated);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Thao tác thất bại";
        const status = msg.includes("Không tìm thấy") ? 404 : 400;
        res.status(status).json({ error: msg });
      }
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH"]);
  });
}

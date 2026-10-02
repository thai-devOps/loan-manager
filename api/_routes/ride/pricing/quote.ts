import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requireAnyPermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import { runPricingV2 } from "../../../_lib/pricing-v2/run-pricing-v2.js";
import type { TollItem } from "../../../../shared/ride/pricing-v2/pricing.types.js";

type PlaceBody = {
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }

    if (
      !(await requireAnyPermission(req, res, [
        PERMISSIONS.FLEET_PRICING_VIEW,
        PERMISSIONS.FLEET_BOOKING_VIEW,
      ]))
    ) {
      return;
    }

    const body = readJsonBody<{
      vehicleId?: string;
      origin?: PlaceBody;
      destination?: PlaceBody;
      pickup?: PlaceBody;
      tripType?: string;
      routeType?: string;
      waitingHours?: number;
      tolls?: TollItem[];
      otherCosts?: number;
      travelDate?: string;
      date?: string;
      distanceKm?: number;
      durationMinutes?: number;
      bookingId?: string;
      distanceAlreadyRoundTrip?: boolean;
      persist?: boolean;
      // Ignored — never trust client fuel overrides
      fuelPrice?: unknown;
      fuelCost?: unknown;
      markup?: unknown;
    }>(req);

    void body.fuelPrice;
    void body.fuelCost;
    void body.markup;

    try {
      const out = await runPricingV2({
        vehicleId: body.vehicleId ?? "",
        origin: body.origin ?? body.pickup,
        destination: body.destination,
        tripType: body.tripType ?? "ONE_WAY",
        routeType: body.routeType,
        waitingHours: body.waitingHours,
        tolls: body.tolls,
        otherCosts: body.otherCosts,
        travelDate: body.travelDate ?? body.date ?? new Date().toISOString(),
        distanceKm: body.distanceKm,
        durationMinutes: body.durationMinutes,
        bookingId: body.bookingId,
        distanceAlreadyRoundTrip: body.distanceAlreadyRoundTrip,
        persist: body.persist !== false,
      });

      const r = out.result;
      res.status(200).json({
        success: true,
        pricingEngineVersion: r.pricingEngineVersion,
        calculationId: out.calculationId,
        route: {
          distanceKm: r.route.pricingDistanceKm,
          oneWayDistanceKm: r.route.oneWayDistanceKm,
          pricingDistanceKm: r.route.pricingDistanceKm,
          durationMinutes: r.route.pricingDurationMinutes,
          routeType: r.route.routeType,
          operationalDistanceKm: r.route.operationalDistanceKm,
          operationalDistanceFactor: r.route.operationalDistanceFactor,
          source: out.routeSource,
          provider: out.provider,
        },
        fuel: {
          fuelType: r.fuel.fuelType,
          pricePerLiter: r.fuel.pricePerLiter,
          source: r.fuel.priceSource,
          sourceDate: r.fuel.priceDate,
          fuelPriceStatus: r.fuel.fuelPriceStatus,
          consumptionLPer100Km: r.fuel.consumptionLPer100Km,
          consumptionSource: r.fuel.consumptionSource,
          estimatedLiters: r.fuel.estimatedLiters,
          fuelCost: r.fuel.fuelCost,
        },
        cost: {
          fuel: r.cost.fuelCost,
          driver: r.cost.driverCost,
          waiting: r.cost.waitingCost,
          toll: r.cost.tollCost,
          depreciation: r.cost.depreciationCost,
          operating: r.cost.operatingCost,
          other: r.cost.otherCost,
          total: r.cost.totalCost,
        },
        pricing: {
          strategy: r.pricing.strategy,
          source: r.pricing.source,
          basePrice: r.pricing.basePrice,
          costPlusPrice: r.pricing.costPlusPrice,
          recommendedPrice: r.pricing.recommendedPrice,
          recommendedPriceBeforeRound: r.pricing.recommendedPriceBeforeRound,
          finalPrice: r.pricing.finalPrice,
          minimumTripPrice: r.pricing.minimumTripPrice,
          targetMargin: r.pricing.targetMargin,
          extraKm: r.pricing.extraKm,
          extraKmCost: r.pricing.extraKmCost,
        },
        driver: r.driver,
        toll: r.toll,
        vehicle: r.vehicle,
        profit: r.profit,
        margin: r.margin,
        marginPercent: r.marginPercent,
        warnings: r.warnings,
        calculationInputs: r.calculationInputs,
        // Compatibility with booking-detail draft mapping
        amount: r.pricing.finalPrice,
        display: `${r.pricing.finalPrice.toLocaleString("vi-VN")} đ`,
        autoQuote: true,
        snapshot: {
          distanceKm: r.route.pricingDistanceKm,
          durationMinutes: r.route.pricingDurationMinutes,
          billableDistanceKm: r.route.pricingDistanceKm,
          operationalDistanceKm: r.route.operationalDistanceKm,
          operationalDistanceFactor: r.route.operationalDistanceFactor,
          fuelPricePerLiter: r.fuel.pricePerLiter ?? 0,
          fuelConsumptionPer100Km: r.fuel.consumptionLPer100Km ?? 0,
          fuelLiters: r.fuel.estimatedLiters,
          fuelCost: r.fuel.fuelCost,
          driverFee: Math.round(r.driver.total),
          tollFee: r.toll.amount,
          parkingFee: 0,
          waitingFee: Math.round(r.driver.waitingCost),
          additionalFee: r.toll.amount + Math.round(r.driver.waitingCost),
          operatingCost: Math.round(
            r.cost.fuelCost +
              r.cost.driverCost +
              r.cost.depreciationCost +
              r.cost.operatingCost,
          ),
          subtotal: r.pricing.finalPrice,
          totalPrice: r.pricing.finalPrice,
          breakdown: [
            { label: "Nhiên liệu", amount: Math.round(r.cost.fuelCost) },
            { label: "Tài xế", amount: Math.round(r.cost.driverCost) },
            { label: "Phí chờ", amount: Math.round(r.cost.waitingCost) },
            { label: "Cầu đường", amount: Math.round(r.cost.tollCost) },
            { label: "Khấu hao", amount: Math.round(r.cost.depreciationCost) },
            { label: "Vận hành", amount: Math.round(r.cost.operatingCost) },
            { label: "Giá đề xuất", amount: r.pricing.finalPrice },
          ],
          quotedAt: new Date().toISOString(),
          fuelSnapshot:
            r.fuel.pricePerLiter != null
              ? {
                  vehicleId: body.vehicleId ?? "",
                  fuelType: r.fuel.fuelType,
                  fuelPrice: Math.round(r.fuel.pricePerLiter),
                  fuelPriceEffectiveAt: r.fuel.priceDate ?? "",
                  billableDistanceKm: r.route.pricingDistanceKm,
                  operationalDistanceKm: r.route.operationalDistanceKm,
                  operationalDistanceFactor: r.route.operationalDistanceFactor,
                  routeCondition: r.route.routeType,
                  consumptionLPer100Km: r.fuel.consumptionLPer100Km ?? 0,
                  estimatedLiters: r.fuel.estimatedLiters,
                  estimatedFuelCost: r.fuel.fuelCost,
                  source: "PVOIL" as const,
                }
              : null,
        },
      });
    } catch (e) {
      const err = e as Error & { code?: string; status?: number };
      const status = err.status ?? 500;
      const code = err.code ?? "QUOTATION_CALCULATION_FAILED";
      res.status(status).json({
        success: false,
        error: err.message || "Không tính được báo giá",
        code,
      });
    }
  });
}

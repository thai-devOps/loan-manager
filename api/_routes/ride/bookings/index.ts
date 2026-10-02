import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { ANTI_SPAM_MESSAGES } from "../../../_lib/booking-anti-spam-config.js";
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
} from "../../../_lib/booking-idempotency.js";
import { assertBookingRateLimits } from "../../../_lib/booking-rate-limiter.js";
import { getClientIp } from "../../../_lib/get-client-ip.js";
import { isBookingAntiSpamEnabled } from "../../../_lib/ride-settings.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  generateBookingCode,
  normalizePhone,
} from "../../../_lib/ride-booking.js";
import { upsertCustomer } from "../../../_lib/ride-customer.js";
import {
  getPricingRule,
  runPricingCalculate,
  seatsToVehicleCategory,
} from "../../../_lib/ride-pricing.js";
import type {
  Place,
  RideBooking,
  ServiceType,
  TripType,
} from "../../../_lib/ride-types.js";
import {
  rideBookingsCol,
  rideVehiclesCol,
  stripDoc,
} from "../../../_lib/mongo.js";
import { maskPhone } from "../../../../shared/ride/booking-anti-spam-helpers.js";

const SERVICE_TYPES = new Set([
  "TRAVEL",
  "MEDICAL",
  "PILGRIMAGE",
  "AIRPORT",
  "BUSINESS",
  "CUSTOM",
]);
const TRIP_TYPES = new Set(["ONE_WAY", "ROUND_TRIP", "DAILY", "CUSTOM"]);

/** Freeze quote from /api/ride/quote — ignore client markup/fuel overrides. */
function parseClientQuoteSnapshot(
  raw: unknown,
): RideBooking["quoteSnapshot"] {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const totalPrice = Number(s.totalPrice);
  if (!(totalPrice > 0) || !Number.isFinite(totalPrice)) return null;
  const fuelSnap =
    s.fuelSnapshot && typeof s.fuelSnapshot === "object"
      ? (s.fuelSnapshot as Record<string, unknown>)
      : null;
  if (
    !fuelSnap ||
    typeof fuelSnap.fuelType !== "string" ||
    !(Number(fuelSnap.estimatedFuelCost) >= 0) ||
    !(Number(fuelSnap.fuelPrice) > 0)
  ) {
    return null;
  }
  return {
    distanceKm: Math.max(0, Number(s.distanceKm) || 0),
    durationMinutes: Math.max(0, Number(s.durationMinutes) || 0),
    billableDistanceKm:
      s.billableDistanceKm != null
        ? Math.max(0, Number(s.billableDistanceKm) || 0)
        : undefined,
    operationalDistanceKm:
      s.operationalDistanceKm != null
        ? Math.max(0, Number(s.operationalDistanceKm) || 0)
        : undefined,
    operationalDistanceFactor:
      s.operationalDistanceFactor != null
        ? Number(s.operationalDistanceFactor)
        : undefined,
    fuelPricePerLiter: Math.max(0, Number(s.fuelPricePerLiter) || 0),
    fuelConsumptionPer100Km: Math.max(
      0,
      Number(s.fuelConsumptionPer100Km) || 0,
    ),
    fuelLiters: Math.max(0, Number(s.fuelLiters) || 0),
    fuelCost: Math.max(0, Math.round(Number(s.fuelCost) || 0)),
    driverFee: Math.max(0, Math.round(Number(s.driverFee) || 0)),
    tollFee: Math.max(0, Math.round(Number(s.tollFee) || 0)),
    parkingFee: Math.max(0, Math.round(Number(s.parkingFee) || 0)),
    waitingFee: Math.max(0, Math.round(Number(s.waitingFee) || 0)),
    additionalFee: Math.max(0, Math.round(Number(s.additionalFee) || 0)),
    operatingCost: Math.max(0, Math.round(Number(s.operatingCost) || 0)),
    subtotal: Math.round(totalPrice),
    totalPrice: Math.round(totalPrice),
    breakdown: Array.isArray(s.breakdown)
      ? s.breakdown
          .filter(
            (line): line is { label: string; amount: number } =>
              !!line &&
              typeof line === "object" &&
              typeof (line as { label?: unknown }).label === "string" &&
              typeof (line as { amount?: unknown }).amount === "number",
          )
          .map((line) => ({
            label: line.label,
            amount: Math.round(line.amount),
          }))
      : [],
    provider: typeof s.provider === "string" ? s.provider : undefined,
    quotedAt:
      typeof s.quotedAt === "string" && s.quotedAt
        ? s.quotedAt
        : new Date().toISOString(),
    fuelSnapshot: {
      vehicleId: String(fuelSnap.vehicleId ?? ""),
      fuelType: String(fuelSnap.fuelType),
      fuelPrice: Math.round(Number(fuelSnap.fuelPrice)),
      fuelPriceEffectiveAt: String(fuelSnap.fuelPriceEffectiveAt ?? ""),
      billableDistanceKm: Math.max(
        0,
        Number(fuelSnap.billableDistanceKm) || 0,
      ),
      operationalDistanceKm: Math.max(
        0,
        Number(fuelSnap.operationalDistanceKm) || 0,
      ),
      operationalDistanceFactor: Math.max(
        1,
        Number(fuelSnap.operationalDistanceFactor) || 1,
      ),
      routeCondition:
        fuelSnap.routeCondition === "city" ||
        fuelSnap.routeCondition === "highway" ||
        fuelSnap.routeCondition === "mixed"
          ? fuelSnap.routeCondition
          : "default",
      consumptionLPer100Km: Number(fuelSnap.consumptionLPer100Km) || 0,
      estimatedLiters: Number(fuelSnap.estimatedLiters) || 0,
      estimatedFuelCost: Math.round(Number(fuelSnap.estimatedFuelCost) || 0),
      source:
        fuelSnap.source === "PVOIL" || fuelSnap.source === "PETROLIMEX"
          ? fuelSnap.source
          : "PETROLIMEX",
    },
  };
}

function parsePlace(raw?: {
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}): Place | null {
  const address = (raw?.address ?? "").trim();
  if (!address) return null;
  const lat = raw?.latitude != null ? Number(raw.latitude) : null;
  const lng = raw?.longitude != null ? Number(raw.longitude) : null;
  return {
    address,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
  };
}

function headerValue(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const col = await rideBookingsCol();

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_BOOKING_VIEW))) return;
      const status = typeof req.query.status === "string" ? req.query.status : "";
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const date = typeof req.query.date === "string" ? req.query.date : "";
      const serviceType =
        typeof req.query.serviceType === "string" ? req.query.serviceType : "";
      const vehicleId =
        typeof req.query.vehicleId === "string" ? req.query.vehicleId : "";
      const driverId =
        typeof req.query.driverId === "string" ? req.query.driverId : "";

      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      if (date) filter.pickupDate = date;
      if (serviceType) filter.serviceType = serviceType;
      if (vehicleId) filter.vehicleId = vehicleId;
      if (driverId) filter.driverId = driverId;
      if (q) {
        const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        filter.$or = [
          { bookingCode: rx },
          { "customer.name": rx },
          { "customer.phone": rx },
          { "destination.address": rx },
          { "pickup.address": rx },
        ];
      }

      const rows = await col
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();
      res.status(200).json(rows.map((r) => stripDoc(r)));
      return;
    }

    if (req.method === "POST") {
      const body = readJsonBody<{
        serviceType?: string;
        pickup?: Place;
        destination?: Place;
        pickupDate?: string;
        pickupTime?: string;
        tripType?: string;
        passengers?: number;
        vehicleId?: string;
        customer?: { name?: string; phone?: string };
        note?: string;
        clientId?: string;
        website?: string;
        pricingRuleId?: string;
        quoteSnapshot?: RideBooking["quoteSnapshot"];
        pricingSnapshot?: RideBooking["pricingSnapshot"];
        quotedPrice?: number | null;
      }>(req);

      const serviceType = (body.serviceType ?? "").trim();
      const tripType = (body.tripType ?? "ONE_WAY").trim() as TripType;
      const pickup = parsePlace(body.pickup);
      const destination = parsePlace(body.destination);
      const pickupDate = (body.pickupDate ?? "").trim();
      const pickupTime = (body.pickupTime ?? "").trim();
      const vehicleId = (body.vehicleId ?? "").trim();
      const customerName = (body.customer?.name ?? "").trim();
      const customerPhone = (body.customer?.phone ?? "").trim();
      const passengers = Number(body.passengers);
      const clientId =
        typeof body.clientId === "string" ? body.clientId.trim() : "";

      if (!SERVICE_TYPES.has(serviceType)) {
        res.status(400).json({ error: "Loại dịch vụ không hợp lệ" });
        return;
      }
      if (!TRIP_TYPES.has(tripType)) {
        res.status(400).json({ error: "Hình thức chuyến không hợp lệ" });
        return;
      }
      if (!pickup || !destination) {
        res.status(400).json({ error: "Vui lòng nhập điểm đón và điểm đến" });
        return;
      }
      if (!pickupDate || !pickupTime) {
        res.status(400).json({ error: "Vui lòng chọn ngày và giờ đón" });
        return;
      }
      if (!Number.isFinite(passengers) || passengers < 1) {
        res.status(400).json({ error: "Số khách không hợp lệ" });
        return;
      }
      if (!vehicleId) {
        res.status(400).json({ error: "Vui lòng chọn xe" });
        return;
      }
      if (!customerName || normalizePhone(customerPhone).length < 9) {
        res.status(400).json({ error: "Thông tin liên hệ không hợp lệ" });
        return;
      }

      // Honeypot + rate limits (can be disabled via admin settings / env)
      const antiSpamOn = await isBookingAntiSpamEnabled();
      if (antiSpamOn) {
        if (typeof body.website === "string" && body.website.trim() !== "") {
          console.info(
            JSON.stringify({
              event: "booking_spam_detected",
              phone: maskPhone(customerPhone),
              timestamp: new Date().toISOString(),
              route: "POST /api/ride/bookings",
            }),
          );
          res.status(400).json({
            error: ANTI_SPAM_MESSAGES.SPAM_DETECTED,
            code: "SPAM_DETECTED",
          });
          return;
        }

        const normalizedPhone = normalizePhone(customerPhone);
        const ip = getClientIp(req);

        const rateFail = await assertBookingRateLimits({
          ip,
          normalizedPhone,
          clientId: clientId || null,
        });
        if (rateFail) {
          res.status(rateFail.httpStatus).json({
            error: rateFail.message,
            code: rateFail.code,
          });
          return;
        }
      }

      const idempotencyRaw = headerValue(req.headers["idempotency-key"]);
      let claim = await claimIdempotencyKey(idempotencyRaw);
      if (claim.kind === "error" && !antiSpamOn) {
        // Anti-spam off: mint a key so create can proceed without client header
        claim = await claimIdempotencyKey(randomUUID());
      }
      if (claim.kind === "error") {
        res.status(claim.httpStatus).json({
          error: claim.message,
          code: claim.code,
        });
        return;
      }
      if (claim.kind === "reuse") {
        res.status(200).json(claim.booking);
        return;
      }

      const vehicles = await rideVehiclesCol();
      const vehicle = await vehicles.findOne({ id: vehicleId, active: true });
      if (!vehicle) {
        res.status(400).json({ error: "Xe không còn khả dụng" });
        return;
      }
      if (vehicle.seats < passengers) {
        res.status(400).json({ error: "Số khách vượt quá số chỗ của xe" });
        return;
      }

      const customerId = await upsertCustomer({
        name: customerName,
        phone: customerPhone,
      });
      const now = new Date().toISOString();
      const id = randomUUID();
      const bookingCode = await generateBookingCode();

      // Prefer frozen vehicle/fuel quote from /api/ride/quote; else fixed-route matrix.
      let quotedPrice: number | null = null;
      let quoteSnapshot: RideBooking["quoteSnapshot"] = null;
      let pricingSnapshot: RideBooking["pricingSnapshot"] = null;

      const incomingSnap = parseClientQuoteSnapshot(body.quoteSnapshot);
      if (incomingSnap) {
        quoteSnapshot = incomingSnap;
        quotedPrice =
          typeof body.quotedPrice === "number" &&
          Number.isFinite(body.quotedPrice) &&
          body.quotedPrice > 0
            ? Math.round(body.quotedPrice)
            : incomingSnap.totalPrice;
        if (
          body.pricingSnapshot &&
          typeof body.pricingSnapshot === "object" &&
          typeof (body.pricingSnapshot as { total?: unknown }).total ===
            "number"
        ) {
          pricingSnapshot = body.pricingSnapshot;
        }
      }

      const pricingRuleId =
        typeof body.pricingRuleId === "string" ? body.pricingRuleId.trim() : "";
      if (!quoteSnapshot) {
        try {
          let originKey = pickup.address;
          let destinationKey = destination.address;
          if (pricingRuleId) {
            const pinned = await getPricingRule(pricingRuleId);
            if (pinned?.status === "ACTIVE") {
              originKey = pinned.originKey || pinned.origin || originKey;
              destinationKey =
                pinned.destinationKey || pinned.destination || destinationKey;
            }
          }
          const calc = await runPricingCalculate({
            serviceType: serviceType as ServiceType,
            vehicleCategory: seatsToVehicleCategory(passengers),
            originKey,
            destinationKey,
            distanceKm: 0,
            roundTrip: tripType === "ROUND_TRIP",
            date: pickupDate,
          });
          if (calc.ok && calc.snapshot) {
            const matched = await getPricingRule(calc.matchedRuleId);
            const perKm = Number(matched?.pricingConfig?.pricePerKm) || 0;
            if (perKm <= 0) {
              quotedPrice = calc.breakdown.total;
              pricingSnapshot = calc.snapshot;
            }
          }
        } catch (err) {
          console.warn("[Booking] Could not attach public pricing quote", err);
        }
      }

      const booking: RideBooking = {
        _id: id,
        id,
        bookingCode,
        serviceType: serviceType as ServiceType,
        pickup,
        destination,
        pickupDate,
        pickupTime,
        tripType,
        passengers,
        vehicleId,
        driverId: null,
        customerId,
        customer: {
          name: customerName,
          phone: customerPhone.trim(),
        },
        note: body.note?.trim() || undefined,
        quotedPrice,
        quoteSnapshot,
        pricingSnapshot,
        deposit: 0,
        paidAmount: 0,
        status: "PENDING",
        driver: null,
        tripId: null,
        createdAt: now,
        updatedAt: now,
      };

      await col.insertOne(booking);
      await completeIdempotencyKey(claim.key, booking.id);

      try {
        const { publishRealtimeEvent } = await import(
          "../../../_lib/realtime/ably.js"
        );
        const { RIDE_ADMIN_CHANNEL } = await import(
          "../../../../shared/ride/realtime.js"
        );
        await publishRealtimeEvent({
          channel: RIDE_ADMIN_CHANNEL,
          event: "booking.created",
          data: {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            createdAt: booking.createdAt,
          },
        });
      } catch (error) {
        console.error("[Realtime] Failed to publish booking.created", error);
      }

      res.status(201).json(stripDoc(booking));
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

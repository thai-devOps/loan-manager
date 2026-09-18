import type { VercelRequest } from "@vercel/node";
import { pickClientIp } from "../../shared/ride/booking-anti-spam-helpers.js";

/**
 * Client IP behind Vercel/proxy. Prefer x-forwarded-for first hop, then x-real-ip.
 * Do not trust custom browser-sent headers.
 */
export function getClientIp(req: VercelRequest): string {
  return pickClientIp({
    forwardedFor: req.headers["x-forwarded-for"],
    realIp: req.headers["x-real-ip"],
    fallback:
      typeof req.socket?.remoteAddress === "string"
        ? req.socket.remoteAddress
        : "unknown",
  });
}

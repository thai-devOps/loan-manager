import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";
import {
  normalizeBookingCode,
  normalizePhone,
} from "../../_lib/ride-booking.js";
import { rideBookingsCol, stripDoc } from "../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const code = normalizeBookingCode(
      typeof req.query.code === "string" ? req.query.code : "",
    );
    const phone = normalizePhone(
      typeof req.query.phone === "string" ? req.query.phone : "",
    );

    if (!code || phone.length < 9) {
      res.status(400).json({ error: "Vui lòng nhập mã chuyến và số điện thoại" });
      return;
    }

    const col = await rideBookingsCol();
    const rows = await col.find({ bookingCode: code }).toArray();
    const match = rows.find(
      (r) => normalizePhone(r.customer.phone) === phone,
    );

    if (!match) {
      res.status(404).json({ error: "Không tìm thấy chuyến" });
      return;
    }

    res.status(200).json(stripDoc(match));
  });
}

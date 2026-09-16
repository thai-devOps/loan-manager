import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  generateCustomerCode,
  normalizeCustomerDoc,
  normalizeCustomerPhone,
  phoneTaken,
} from "../../../_lib/ride-customer.js";
import type { RideCustomer, RideCustomerStatus } from "../../../_lib/ride-types.js";
import { rideCustomersCol, stripDoc } from "../../../_lib/mongo.js";

type CreateBody = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  status?: RideCustomerStatus;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const col = await rideCustomersCol();

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_CUSTOMER_VIEW))) {
        return;
      }
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const status =
        typeof req.query.status === "string" ? req.query.status : "";

      const filter: Record<string, unknown> = {};
      if (status === "ACTIVE" || status === "INACTIVE") {
        filter.status = status;
      }
      if (q) {
        const rx = {
          $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        };
        filter.$or = [
          { customerCode: rx },
          { name: rx },
          { phone: rx },
          { email: rx },
        ];
      }

      const rows = await col
        .find(filter)
        .sort({ lastBookingAt: -1, updatedAt: -1 })
        .toArray();
      res.status(200).json(rows.map((r) => stripDoc(normalizeCustomerDoc(r))));
      return;
    }

    if (req.method === "POST") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_CUSTOMER_CREATE))) {
        return;
      }
      const body = readJsonBody<CreateBody>(req);
      const name = (body.name ?? "").trim();
      const phone = normalizeCustomerPhone(body.phone ?? "");
      if (!name) {
        res.status(400).json({ error: "Vui lòng nhập họ tên" });
        return;
      }
      if (phone.length < 8) {
        res.status(400).json({ error: "SĐT không hợp lệ" });
        return;
      }
      if (await phoneTaken(phone)) {
        res.status(409).json({ error: "SĐT đã tồn tại" });
        return;
      }

      const now = new Date().toISOString();
      const id = randomUUID();
      const row: RideCustomer = {
        _id: id,
        id,
        customerCode: await generateCustomerCode(),
        name,
        phone,
        email: body.email?.trim() || undefined,
        address: body.address?.trim() || undefined,
        note: body.note?.trim() || undefined,
        status: body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        tripCount: 0,
        totalSpend: 0,
        createdAt: now,
        updatedAt: now,
      };
      await col.insertOne(row);
      res.status(201).json(stripDoc(normalizeCustomerDoc(row)));
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

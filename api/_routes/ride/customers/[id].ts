import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../../_lib/access/catalog.js";
import { requirePermission } from "../../../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../../_lib/http.js";
import {
  getCustomerDetail,
  normalizeCustomerDoc,
  normalizeCustomerPhone,
  phoneTaken,
  refreshCustomerStats,
} from "../../../_lib/ride-customer.js";
import type { RideCustomerStatus } from "../../../_lib/ride-types.js";
import { rideCustomersCol, stripDoc } from "../../../_lib/mongo.js";

type PatchBody = {
  action?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  status?: RideCustomerStatus;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const col = await rideCustomersCol();

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_CUSTOMER_VIEW))) {
        return;
      }
      const include =
        typeof req.query.include === "string" ? req.query.include : "";
      if (include === "history") {
        await refreshCustomerStats(id);
        const detail = await getCustomerDetail(id);
        if (!detail) {
          res.status(404).json({ error: "Không tìm thấy khách hàng" });
          return;
        }
        res.status(200).json(detail);
        return;
      }

      const row = await col.findOne({ id });
      if (!row) {
        res.status(404).json({ error: "Không tìm thấy khách hàng" });
        return;
      }
      res.status(200).json(stripDoc(normalizeCustomerDoc(row)));
      return;
    }

    if (req.method === "PATCH") {
      const body = readJsonBody<PatchBody>(req);
      const row = await col.findOne({ id });
      if (!row) {
        res.status(404).json({ error: "Không tìm thấy khách hàng" });
        return;
      }
      const now = new Date().toISOString();
      const action = (body.action ?? "").trim();

      if (action === "deactivate") {
        if (!(await requirePermission(req, res, PERMISSIONS.FLEET_CUSTOMER_DELETE))) {
          return;
        }
        const result = await col.findOneAndUpdate(
          { id },
          { $set: { status: "INACTIVE", updatedAt: now } },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(normalizeCustomerDoc(result!)));
        return;
      }

      if (action === "activate") {
        if (!(await requirePermission(req, res, PERMISSIONS.FLEET_CUSTOMER_UPDATE))) {
          return;
        }
        const result = await col.findOneAndUpdate(
          { id },
          { $set: { status: "ACTIVE", updatedAt: now } },
          { returnDocument: "after" },
        );
        res.status(200).json(stripDoc(normalizeCustomerDoc(result!)));
        return;
      }

      if (!(await requirePermission(req, res, PERMISSIONS.FLEET_CUSTOMER_UPDATE))) {
        return;
      }

      const patch: Record<string, unknown> = { updatedAt: now };
      if (body.name !== undefined) {
        const name = body.name.trim();
        if (!name) {
          res.status(400).json({ error: "Vui lòng nhập họ tên" });
          return;
        }
        patch.name = name;
      }
      if (body.phone !== undefined) {
        const phone = normalizeCustomerPhone(body.phone);
        if (phone.length < 8) {
          res.status(400).json({ error: "SĐT không hợp lệ" });
          return;
        }
        if (await phoneTaken(phone, id)) {
          res.status(409).json({ error: "SĐT đã tồn tại" });
          return;
        }
        patch.phone = phone;
      }
      if (body.email !== undefined) {
        patch.email = body.email?.trim() || null;
      }
      if (body.address !== undefined) {
        patch.address = body.address?.trim() || null;
      }
      if (body.note !== undefined) {
        patch.note = body.note?.trim() || null;
      }
      if (body.status === "ACTIVE" || body.status === "INACTIVE") {
        patch.status = body.status;
      }

      const result = await col.findOneAndUpdate(
        { id },
        { $set: patch },
        { returnDocument: "after" },
      );
      res.status(200).json(stripDoc(normalizeCustomerDoc(result!)));
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH"]);
  });
}

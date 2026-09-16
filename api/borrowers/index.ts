import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { PERMISSIONS } from "../_lib/access/catalog.js";
import { requirePermission } from "../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../_lib/http.js";
import { borrowersCol, stripDoc } from "../_lib/mongo.js";
import type { Borrower } from "../_lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const col = await borrowersCol();

    if (req.method === "GET") {
      if (!(await requirePermission(req, res, PERMISSIONS.LOAN_BORROWER_VIEW))) return;
      const rows = await col.find({}).sort({ name: 1 }).toArray();
      res.status(200).json(rows.map((r) => stripDoc(r)));
      return;
    }

    if (req.method === "POST") {
      if (!(await requirePermission(req, res, PERMISSIONS.LOAN_BORROWER_CREATE))) return;
      const body = readJsonBody<{
        name?: string;
        phone?: string;
        identityNumber?: string;
        address?: string;
        note?: string;
      }>(req);
      const name = (body.name ?? "").trim();
      if (!name) {
        res.status(400).json({ error: "Vui lòng nhập tên người vay" });
        return;
      }
      const now = new Date().toISOString();
      const id = randomUUID();
      const borrower: Borrower = {
        _id: id,
        id,
        name,
        phone: body.phone?.trim() || undefined,
        identityNumber: body.identityNumber?.trim() || undefined,
        address: body.address?.trim() || undefined,
        note: body.note?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      await col.insertOne(borrower);
      res.status(201).json(stripDoc(borrower));
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

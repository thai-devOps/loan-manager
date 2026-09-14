import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../../server/lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../../server/lib/http.js";
import { borrowersCol, stripDoc } from "../../server/lib/mongo.js";
import type { Borrower } from "../../server/lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;
    const col = await borrowersCol();

    if (req.method === "GET") {
      const rows = await col.find({}).sort({ name: 1 }).toArray();
      res.status(200).json(rows.map((r) => stripDoc(r)));
      return;
    }

    if (req.method === "POST") {
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

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../_lib/http.js";
import { borrowersCol, stripDoc } from "../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;
    const id = req.query.id;
    if (typeof id !== "string" || !id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const col = await borrowersCol();

    if (req.method === "GET") {
      const row = await col.findOne({ id });
      if (!row) {
        res.status(404).json({ error: "Không tìm thấy người vay" });
        return;
      }
      res.status(200).json(stripDoc(row));
      return;
    }

    if (req.method === "PATCH") {
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
      const result = await col.findOneAndUpdate(
        { id },
        {
          $set: {
            name,
            phone: body.phone?.trim() || undefined,
            identityNumber: body.identityNumber?.trim() || undefined,
            address: body.address?.trim() || undefined,
            note: body.note?.trim() || undefined,
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" },
      );
      if (!result) {
        res.status(404).json({ error: "Không tìm thấy người vay" });
        return;
      }
      res.status(200).json(stripDoc(result));
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH"]);
  });
}

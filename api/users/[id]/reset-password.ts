import type { VercelRequest, VercelResponse } from "@vercel/node";
import { writeAuditLog } from "../../_lib/access/audit.js";
import { hashPassword } from "../../_lib/access/password.js";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import {
  methodNotAllowed,
  readJsonBody,
  withHandler,
} from "../../_lib/http.js";
import { usersCol } from "../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }
    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    const ctx = await requirePermission(req, res, PERMISSIONS.USER_UPDATE);
    if (!ctx) return;

    const body = readJsonBody<{ password?: string }>(req);
    const password = (body.password ?? "").trim();
    if (password.length < 6) {
      res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });
      return;
    }

    const col = await usersCol();
    const user = await col.findOne({ id });
    if (!user) {
      res.status(404).json({ error: "Không tìm thấy người dùng" });
      return;
    }

    await col.updateOne(
      { id },
      {
        $set: {
          passwordHash: await hashPassword(password),
          updatedAt: new Date().toISOString(),
        },
      },
    );
    await writeAuditLog({
      actorId: ctx.userId,
      action: "USER_PASSWORD_RESET",
      targetType: "user",
      targetId: id,
    });
    res.status(200).json({ ok: true });
  });
}

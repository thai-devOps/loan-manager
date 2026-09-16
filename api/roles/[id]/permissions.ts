import type { VercelRequest, VercelResponse } from "@vercel/node";
import { writeAuditLog } from "../../_lib/access/audit.js";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  SYSTEM_ROLE_CODES,
} from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import {
  methodNotAllowed,
  readJsonBody,
  withHandler,
} from "../../_lib/http.js";
import { rolesCol, stripDoc } from "../../_lib/mongo.js";

function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set<string>(ALL_PERMISSIONS);
  return [
    ...new Set(
      input.filter((p): p is string => typeof p === "string" && allowed.has(p)),
    ),
  ].sort();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "PATCH") {
      methodNotAllowed(res, ["PATCH"]);
      return;
    }
    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    const ctx = await requirePermission(req, res, PERMISSIONS.ROLE_UPDATE);
    if (!ctx) return;

    const col = await rolesCol();
    const role = await col.findOne({ id });
    if (!role) {
      res.status(404).json({ error: "Không tìm thấy role" });
      return;
    }
    if (role.code === SYSTEM_ROLE_CODES.SUPER_ADMIN) {
      res.status(400).json({
        error: "Không thể chỉnh permission của SUPER_ADMIN",
      });
      return;
    }

    const body = readJsonBody<{ permissions?: string[] }>(req);
    const permissions = sanitizePermissions(body.permissions);
    await col.updateOne(
      { id },
      { $set: { permissions, updatedAt: new Date().toISOString() } },
    );
    const updated = await col.findOne({ id });
    await writeAuditLog({
      actorId: ctx.userId,
      action: "ROLE_PERMISSIONS_CHANGED",
      targetType: "role",
      targetId: id,
      metadata: { count: permissions.length },
    });
    res.status(200).json({ role: updated ? stripDoc(updated) : null });
  });
}

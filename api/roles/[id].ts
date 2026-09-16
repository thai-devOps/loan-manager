import type { VercelRequest, VercelResponse } from "@vercel/node";
import { writeAuditLog } from "../_lib/access/audit.js";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  SYSTEM_ROLE_CODES,
} from "../_lib/access/catalog.js";
import type { AppRole } from "../_lib/access/types.js";
import { requirePermission } from "../_lib/auth.js";
import {
  methodNotAllowed,
  readJsonBody,
  withHandler,
} from "../_lib/http.js";
import { rolesCol, stripDoc, usersCol } from "../_lib/mongo.js";

function getId(req: VercelRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

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
    const id = getId(req);
    if (!id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    if (req.method === "GET") {
      const ctx = await requirePermission(req, res, PERMISSIONS.ROLE_VIEW);
      if (!ctx) return;
      const col = await rolesCol();
      const role = await col.findOne({ id });
      if (!role) {
        res.status(404).json({ error: "Không tìm thấy role" });
        return;
      }
      res.status(200).json({ role: stripDoc(role) });
      return;
    }

    if (req.method === "PATCH") {
      const ctx = await requirePermission(req, res, PERMISSIONS.ROLE_UPDATE);
      if (!ctx) return;
      const col = await rolesCol();
      const role = await col.findOne({ id });
      if (!role) {
        res.status(404).json({ error: "Không tìm thấy role" });
        return;
      }

      const body = readJsonBody<{
        name?: string;
        description?: string;
        permissions?: string[];
        active?: boolean;
      }>(req);

      const $set: Partial<AppRole> = {
        updatedAt: new Date().toISOString(),
      };
      if (typeof body.name === "string") $set.name = body.name.trim();
      if (typeof body.description === "string")
        $set.description = body.description.trim();
      if (typeof body.active === "boolean") {
        if (role.isSystemRole && !body.active) {
          res.status(400).json({
            error: "Không thể vô hiệu hóa system role",
          });
          return;
        }
        $set.active = body.active;
      }
      if (body.permissions !== undefined) {
        if (role.code === SYSTEM_ROLE_CODES.SUPER_ADMIN) {
          res.status(400).json({
            error: "Không thể chỉnh permission của SUPER_ADMIN",
          });
          return;
        }
        $set.permissions = sanitizePermissions(body.permissions);
      }

      await col.updateOne({ id }, { $set });
      const updated = await col.findOne({ id });
      await writeAuditLog({
        actorId: ctx.userId,
        action: "ROLE_UPDATED",
        targetType: "role",
        targetId: id,
      });
      res.status(200).json({ role: updated ? stripDoc(updated) : null });
      return;
    }

    if (req.method === "DELETE") {
      const ctx = await requirePermission(req, res, PERMISSIONS.ROLE_DELETE);
      if (!ctx) return;
      const col = await rolesCol();
      const role = await col.findOne({ id });
      if (!role) {
        res.status(404).json({ error: "Không tìm thấy role" });
        return;
      }
      if (role.isSystemRole) {
        res.status(400).json({ error: "Không thể xóa system role" });
        return;
      }
      const uCol = await usersCol();
      const inUse = await uCol.countDocuments({ roleIds: id });
      if (inUse > 0) {
        res.status(400).json({
          error: `Role đang được gán cho ${inUse} người dùng`,
        });
        return;
      }
      await col.deleteOne({ id });
      await writeAuditLog({
        actorId: ctx.userId,
        action: "ROLE_DELETED",
        targetType: "role",
        targetId: id,
        metadata: { code: role.code },
      });
      res.status(200).json({ ok: true });
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
  });
}

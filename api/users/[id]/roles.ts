import type { VercelRequest, VercelResponse } from "@vercel/node";
import { writeAuditLog } from "../../_lib/access/audit.js";
import { PERMISSIONS, SYSTEM_ROLE_CODES } from "../../_lib/access/catalog.js";
import { toPublicUser } from "../../_lib/access/types.js";
import type { AppUser } from "../../_lib/access/types.js";
import { requirePermission } from "../../_lib/auth.js";
import {
  methodNotAllowed,
  readJsonBody,
  withHandler,
} from "../../_lib/http.js";
import { rolesCol, usersCol } from "../../_lib/mongo.js";

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

    const ctx = await requirePermission(req, res, PERMISSIONS.USER_UPDATE);
    if (!ctx) return;

    const body = readJsonBody<{ roleIds?: string[] }>(req);
    const roleIds = Array.isArray(body.roleIds) ? body.roleIds : null;
    if (!roleIds) {
      res.status(400).json({ error: "roleIds không hợp lệ" });
      return;
    }

    const col = await usersCol();
    const user = await col.findOne({ id });
    if (!user) {
      res.status(404).json({ error: "Không tìm thấy người dùng" });
      return;
    }

    const rCol = await rolesCol();
    const found = await rCol.countDocuments({ id: { $in: roleIds } });
    if (found !== roleIds.length) {
      res.status(400).json({ error: "Một hoặc nhiều role không hợp lệ" });
      return;
    }

    if (
      id === ctx.userId &&
      !(await retainsSuperAdmin(roleIds)) &&
      (await isLastActiveSuperAdmin(user))
    ) {
      res.status(400).json({
        error: "Không thể gỡ Super Admin khỏi chính mình khi là người cuối",
      });
      return;
    }

    await col.updateOne(
      { id },
      { $set: { roleIds, updatedAt: new Date().toISOString() } },
    );
    const updated = await col.findOne({ id });
    await writeAuditLog({
      actorId: ctx.userId,
      action: "USER_ROLES_CHANGED",
      targetType: "user",
      targetId: id,
      metadata: { roleIds },
    });
    res.status(200).json({ user: updated ? toPublicUser(updated) : null });
  });
}

async function isLastActiveSuperAdmin(user: AppUser): Promise<boolean> {
  const rCol = await rolesCol();
  const superRole = await rCol.findOne({
    code: SYSTEM_ROLE_CODES.SUPER_ADMIN,
  });
  if (!superRole || !user.roleIds.includes(superRole.id)) return false;
  const uCol = await usersCol();
  const count = await uCol.countDocuments({
    status: "ACTIVE",
    roleIds: superRole.id,
  });
  return count <= 1;
}

async function retainsSuperAdmin(roleIds: string[]): Promise<boolean> {
  const rCol = await rolesCol();
  const superRole = await rCol.findOne({
    code: SYSTEM_ROLE_CODES.SUPER_ADMIN,
  });
  if (!superRole) return true;
  return roleIds.includes(superRole.id);
}

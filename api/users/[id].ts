import type { VercelRequest, VercelResponse } from "@vercel/node";
import { writeAuditLog } from "../_lib/access/audit.js";
import { getEffectivePermissions } from "../_lib/access/permissions-resolve.js";
import { PERMISSIONS, SYSTEM_ROLE_CODES } from "../_lib/access/catalog.js";
import type { AppUser } from "../_lib/access/types.js";
import { toPublicUser } from "../_lib/access/types.js";
import { requirePermission } from "../_lib/auth.js";
import {
  methodNotAllowed,
  readJsonBody,
  withHandler,
} from "../_lib/http.js";
import { rolesCol, usersCol } from "../_lib/mongo.js";

function getId(req: VercelRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    const id = getId(req);
    if (!id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    if (req.method === "GET") {
      const ctx = await requirePermission(req, res, PERMISSIONS.USER_VIEW);
      if (!ctx) return;
      const col = await usersCol();
      const user = await col.findOne({ id });
      if (!user) {
        res.status(404).json({ error: "Không tìm thấy người dùng" });
        return;
      }
      const effective = await getEffectivePermissions(user);
      const rCol = await rolesCol();
      const roles = await rCol
        .find({ id: { $in: user.roleIds } })
        .toArray()
        .then((docs) =>
          docs.map(({ _id: _u, ...rest }) => {
            void _u;
            return rest;
          }),
        );
      res.status(200).json({
        user: toPublicUser(user),
        roles,
        permissions: effective.permissions,
      });
      return;
    }

    if (req.method === "PATCH") {
      const ctx = await requirePermission(req, res, PERMISSIONS.USER_UPDATE);
      if (!ctx) return;
      const col = await usersCol();
      const user = await col.findOne({ id });
      if (!user) {
        res.status(404).json({ error: "Không tìm thấy người dùng" });
        return;
      }

      const body = readJsonBody<{
        name?: string;
        email?: string;
        username?: string;
        status?: AppUser["status"];
        avatarUrl?: string | null;
        roleIds?: string[];
      }>(req);

      const $set: Partial<AppUser> = {
        updatedAt: new Date().toISOString(),
      };

      if (typeof body.name === "string") $set.name = body.name.trim();
      if (typeof body.email === "string")
        $set.email = body.email.trim().toLowerCase();
      if (typeof body.username === "string")
        $set.username = body.username.trim();
      if (body.avatarUrl === null) $set.avatarUrl = undefined;
      else if (typeof body.avatarUrl === "string")
        $set.avatarUrl = body.avatarUrl.trim() || undefined;

      if (body.status) {
        if (body.status !== "ACTIVE" && id === ctx.userId) {
          res.status(400).json({
            error: "Không thể tự khóa tài khoản đang đăng nhập",
          });
          return;
        }
        if (
          body.status !== "ACTIVE" &&
          (await isLastActiveSuperAdmin(user))
        ) {
          res.status(400).json({
            error: "Không thể khóa Super Admin cuối cùng",
          });
          return;
        }
        $set.status = body.status;
      }

      if (Array.isArray(body.roleIds)) {
        const rCol = await rolesCol();
        const found = await rCol.countDocuments({
          id: { $in: body.roleIds },
        });
        if (found !== body.roleIds.length) {
          res.status(400).json({ error: "Một hoặc nhiều role không hợp lệ" });
          return;
        }
        if (
          id === ctx.userId &&
          !(await retainsSuperAdmin(body.roleIds)) &&
          (await isLastActiveSuperAdmin(user))
        ) {
          res.status(400).json({
            error: "Không thể gỡ Super Admin khỏi chính mình khi là người cuối",
          });
          return;
        }
        $set.roleIds = body.roleIds;
      }

      if ($set.email || $set.username) {
        const or: Record<string, unknown>[] = [];
        if ($set.email) or.push({ email: $set.email });
        if ($set.username) {
          or.push({
            username: {
              $regex: new RegExp(`^${escapeRegex($set.username)}$`, "i"),
            },
          });
        }
        const conflict = await col.findOne({
          id: { $ne: id },
          $or: or,
        });
        if (conflict) {
          res.status(409).json({ error: "Username hoặc email đã tồn tại" });
          return;
        }
      }

      await col.updateOne({ id }, { $set });
      const updated = await col.findOne({ id });
      if (!updated) {
        res.status(404).json({ error: "Không tìm thấy người dùng" });
        return;
      }

      await writeAuditLog({
        actorId: ctx.userId,
        action:
          body.status && body.status !== user.status
            ? body.status === "ACTIVE"
              ? "USER_ENABLED"
              : "USER_DISABLED"
            : "USER_UPDATED",
        targetType: "user",
        targetId: id,
        metadata: { fields: Object.keys(body) },
      });

      res.status(200).json({ user: toPublicUser(updated) });
      return;
    }

    if (req.method === "DELETE") {
      const ctx = await requirePermission(req, res, PERMISSIONS.USER_DELETE);
      if (!ctx) return;
      if (id === ctx.userId) {
        res.status(400).json({ error: "Không thể xóa chính mình" });
        return;
      }
      const col = await usersCol();
      const user = await col.findOne({ id });
      if (!user) {
        res.status(404).json({ error: "Không tìm thấy người dùng" });
        return;
      }
      if (await isLastActiveSuperAdmin(user)) {
        res.status(400).json({ error: "Không thể xóa Super Admin cuối cùng" });
        return;
      }
      await col.deleteOne({ id });
      await writeAuditLog({
        actorId: ctx.userId,
        action: "USER_DELETED",
        targetType: "user",
        targetId: id,
        metadata: { username: user.username },
      });
      res.status(200).json({ ok: true });
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
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

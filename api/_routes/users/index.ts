import { randomUUID } from "node:crypto";
import { writeAuditLog } from "../../_lib/access/audit.js";
import { hashPassword } from "../../_lib/access/password.js";
import type { AppUser, PublicUser } from "../../_lib/access/types.js";
import { toPublicUser } from "../../_lib/access/types.js";
import { requirePermission } from "../../_lib/auth.js";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import {
  methodNotAllowed,
  readJsonBody,
  withHandler,
} from "../../_lib/http.js";
import { rolesCol, usersCol } from "../../_lib/mongo.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method === "GET") {
      const ctx = await requirePermission(req, res, PERMISSIONS.USER_VIEW);
      if (!ctx) return;

      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const status =
        typeof req.query.status === "string" ? req.query.status.trim() : "";
      const roleId =
        typeof req.query.roleId === "string" ? req.query.roleId.trim() : "";

      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      if (roleId) filter.roleIds = roleId;
      if (q) {
        filter.$or = [
          { name: { $regex: escapeRegex(q), $options: "i" } },
          { email: { $regex: escapeRegex(q), $options: "i" } },
          { username: { $regex: escapeRegex(q), $options: "i" } },
        ];
      }

      const col = await usersCol();
      const docs = await col.find(filter).sort({ createdAt: -1 }).toArray();
      const users: PublicUser[] = docs.map((d) => toPublicUser(d));
      res.status(200).json({ users });
      return;
    }

    if (req.method === "POST") {
      const ctx = await requirePermission(req, res, PERMISSIONS.USER_CREATE);
      if (!ctx) return;

      const body = readJsonBody<{
        name?: string;
        email?: string;
        username?: string;
        password?: string;
        roleIds?: string[];
        status?: AppUser["status"];
        avatarUrl?: string;
      }>(req);

      const name = (body.name ?? "").trim();
      const email = (body.email ?? "").trim().toLowerCase();
      const username = (body.username ?? "").trim();
      const password = (body.password ?? "").trim();
      const roleIds = Array.isArray(body.roleIds) ? body.roleIds : [];

      if (!name || !email || !username || !password) {
        res.status(400).json({
          error: "Thiếu họ tên, email, tên đăng nhập hoặc mật khẩu",
        });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });
        return;
      }

      if (roleIds.length > 0) {
        const rCol = await rolesCol();
        const found = await rCol.countDocuments({ id: { $in: roleIds } });
        if (found !== roleIds.length) {
          res.status(400).json({ error: "Một hoặc nhiều role không hợp lệ" });
          return;
        }
      }

      const col = await usersCol();
      const dup = await col.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") } },
          { email },
        ],
      });
      if (dup) {
        res.status(409).json({ error: "Username hoặc email đã tồn tại" });
        return;
      }

      const now = new Date().toISOString();
      const user: AppUser = {
        id: randomUUID(),
        name,
        email,
        username,
        passwordHash: await hashPassword(password),
        avatarUrl: body.avatarUrl?.trim() || undefined,
        roleIds,
        status: body.status ?? "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };
      await col.insertOne(user);

      await writeAuditLog({
        actorId: ctx.userId,
        action: "USER_CREATED",
        targetType: "user",
        targetId: user.id,
        metadata: { username: user.username },
      });

      res.status(201).json({ user: toPublicUser(user) });
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
}

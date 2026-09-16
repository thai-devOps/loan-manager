import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { writeAuditLog } from "../../_lib/access/audit.js";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
} from "../../_lib/access/catalog.js";
import type { AppRole } from "../../_lib/access/types.js";
import { requirePermission } from "../../_lib/auth.js";
import {
  methodNotAllowed,
  readJsonBody,
  withHandler,
} from "../../_lib/http.js";
import { rolesCol, stripDoc } from "../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method === "GET") {
      const ctx = await requirePermission(req, res, PERMISSIONS.ROLE_VIEW);
      if (!ctx) return;
      const col = await rolesCol();
      const roles = await col.find({}).sort({ name: 1 }).toArray();
      res.status(200).json({
        roles: roles.map((r) => stripDoc(r)),
      });
      return;
    }

    if (req.method === "POST") {
      const ctx = await requirePermission(req, res, PERMISSIONS.ROLE_CREATE);
      if (!ctx) return;
      const body = readJsonBody<{
        name?: string;
        code?: string;
        description?: string;
        permissions?: string[];
        active?: boolean;
      }>(req);

      const name = (body.name ?? "").trim();
      const code = (body.code ?? "").trim().toUpperCase().replace(/\s+/g, "_");
      if (!name || !code) {
        res.status(400).json({ error: "Thiếu tên hoặc mã role" });
        return;
      }

      const permissions = sanitizePermissions(body.permissions);
      const col = await rolesCol();
      const existing = await col.findOne({ code });
      if (existing) {
        res.status(409).json({ error: "Mã role đã tồn tại" });
        return;
      }

      const now = new Date().toISOString();
      const role: AppRole = {
        id: randomUUID(),
        name,
        code,
        description: body.description?.trim() || undefined,
        permissions,
        isSystemRole: false,
        active: body.active ?? true,
        createdAt: now,
        updatedAt: now,
      };
      await col.insertOne(role);
      await writeAuditLog({
        actorId: ctx.userId,
        action: "ROLE_CREATED",
        targetType: "role",
        targetId: role.id,
        metadata: { code: role.code },
      });
      res.status(201).json({ role: stripDoc(role) });
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  });
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

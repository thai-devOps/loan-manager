import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ALL_PERMISSIONS,
  getPermissionsByModule,
  MODULES,
  PERMISSIONS,
  ROLE_PRESETS,
  describePermission,
  permissionResourceLabel,
} from "../../_lib/access/catalog.js";
import { requirePermission } from "../../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const ctx = await requirePermission(req, res, PERMISSIONS.ROLE_VIEW);
    if (!ctx) return;

    const byModule = getPermissionsByModule();
    res.status(200).json({
      modules: MODULES,
      permissions: ALL_PERMISSIONS,
      byModule,
      presets: ROLE_PRESETS,
      meta: ALL_PERMISSIONS.map((code) => {
        const d = describePermission(code);
        if (!d) {
          return { code };
        }
        return {
          code,
          module: d.module,
          resource: d.resource,
          resourceLabel: permissionResourceLabel(d.resource),
          action: d.action,
          label: d.label,
        };
      }),
    });
  });
}

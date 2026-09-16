import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { AuthMeResponse } from "../_lib/access/types.js";
import { toPublicUser } from "../_lib/access/types.js";
import { requireAuth } from "../_lib/auth.js";
import { methodNotAllowed, withHandler } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }

    const ctx = await requireAuth(req, res);
    if (!ctx) return;

    const body: AuthMeResponse = {
      user: toPublicUser(ctx.user),
      roles: ctx.roleCodes,
      permissions: ctx.permissions,
    };
    res.status(200).json(body);
  });
}

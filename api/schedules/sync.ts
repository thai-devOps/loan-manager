import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib/auth";
import { methodNotAllowed, withHandler } from "../_lib/http";
import { syncAllSchedules } from "../_lib/sync";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (!(await requireAuth(req, res))) return;
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }
    await syncAllSchedules();
    res.status(200).json({ ok: true });
  });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { writeAuditLog } from "../_lib/access/audit.js";
import { verifyPassword } from "../_lib/access/password.js";
import { ensureAccessControlSeed } from "../_lib/access/seed.js";
import { signToken } from "../_lib/auth.js";
import { methodNotAllowed, readJsonBody, withHandler } from "../_lib/http.js";
import { usersCol } from "../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }

    await ensureAccessControlSeed();

    const body = readJsonBody<{ username?: string; password?: string }>(req);
    const username = (body.username ?? "").trim();
    const password = (body.password ?? "").trim();

    if (!username || !password) {
      res.status(401).json({
        error: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
      return;
    }

    const col = await usersCol();
    const user = await col.findOne({
      username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({
        error: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(401).json({
        error: "Tài khoản đã bị khóa hoặc vô hiệu hóa",
      });
      return;
    }

    const now = new Date().toISOString();
    await col.updateOne(
      { id: user.id },
      { $set: { lastLoginAt: now, updatedAt: now } },
    );

    const token = await signToken({
      userId: user.id,
      username: user.username,
    });

    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN",
      targetType: "user",
      targetId: user.id,
    });

    res.status(200).json({ token, username: user.username, userId: user.id });
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

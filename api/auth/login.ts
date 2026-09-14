import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminCredentials, signToken } from "../_lib/auth";
import { methodNotAllowed, readJsonBody, withHandler } from "../_lib/http";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }

    const expected = getAdminCredentials();
    if (!expected) {
      res.status(500).json({
        error:
          "Cấu hình đăng nhập chưa sẵn sàng. Kiểm tra ADMIN_USERNAME / ADMIN_PASSWORD.",
      });
      return;
    }

    const body = readJsonBody<{ username?: string; password?: string }>(req);
    const username = (body.username ?? "").trim();
    const password = (body.password ?? "").trim();

    if (
      username !== expected.username ||
      password !== expected.password
    ) {
      res.status(401).json({
        error: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
      return;
    }

    const token = await signToken(username);
    res.status(200).json({ token, username });
  });
}

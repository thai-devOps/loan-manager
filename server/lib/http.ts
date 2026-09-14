import type { VercelRequest, VercelResponse } from "@vercel/node";

export function methodNotAllowed(res: VercelResponse, allow: string[]) {
  res.setHeader("Allow", allow.join(", "));
  return res.status(405).json({ error: "Method not allowed" });
}

export function readJsonBody<T>(req: VercelRequest): T {
  return (req.body ?? {}) as T;
}

export function handleError(res: VercelResponse, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Internal server error";
  const status =
    message.includes("not configured") || message.includes("MONGODB_URI")
      ? 500
      : message.includes("Không tìm thấy")
        ? 404
        : message.includes("không được") ||
            message.includes("phải lớn hơn") ||
            message.includes("không hợp lệ")
          ? 400
          : 500;
  return res.status(status).json({ error: message });
}

export async function withHandler(
  _req: VercelRequest,
  res: VercelResponse,
  fn: () => Promise<void>,
) {
  try {
    await fn();
  } catch (error) {
    handleError(res, error);
  }
}

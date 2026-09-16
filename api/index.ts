import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dispatchApi } from "./_lib/api-router.js";

/**
 * Sole Vercel Serverless Function entry (Hobby ≤12 limit).
 * All `/api/*` requests are rewritten here via vercel.json.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    const handled = await dispatchApi(req, res);
    if (handled) return;
    res.status(404).json({ error: "API route not found" });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Internal server error",
    });
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PERMISSIONS } from "../../_lib/access/catalog.js";
import { requireAnyPermission } from "../../_lib/auth.js";
import {
  createUploadSignature,
  destroyImage,
} from "../../_lib/cloudinary.js";
import {
  methodNotAllowed,
  readJsonBody,
  withHandler,
} from "../../_lib/http.js";

const UPLOAD_PERMISSIONS = [
  PERMISSIONS.FLEET_VEHICLE_CREATE,
  PERMISSIONS.FLEET_VEHICLE_UPDATE,
  PERMISSIONS.FLEET_DRIVER_CREATE,
  PERMISSIONS.FLEET_DRIVER_UPDATE,
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await withHandler(req, res, async () => {
    if (req.method === "POST") {
      if (!(await requireAnyPermission(req, res, UPLOAD_PERMISSIONS))) return;
      try {
        const body = readJsonBody<{ folder?: string }>(req);
        const data = createUploadSignature(body.folder);
        res.status(200).json({ success: true, data });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload image failed";
        const status = message.includes("không hợp lệ")
          ? 400
          : message.includes("not configured")
            ? 500
            : 500;
        res.status(status).json({
          success: false,
          message:
            message.includes("not configured") ||
            message.includes("không hợp lệ")
              ? message
              : "Upload image failed",
        });
      }
      return;
    }

    if (req.method === "DELETE") {
      if (!(await requireAnyPermission(req, res, UPLOAD_PERMISSIONS))) return;
      try {
        const body = readJsonBody<{ publicId?: string }>(req);
        const publicId = (body.publicId ?? "").trim();
        if (!publicId) {
          res.status(400).json({
            success: false,
            message: "Thiếu publicId",
          });
          return;
        }
        await destroyImage(publicId);
        res.status(200).json({ success: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Delete image failed";
        const status = message.includes("không hợp lệ") ? 400 : 500;
        res.status(status).json({
          success: false,
          message:
            message.includes("không hợp lệ") || message.includes("Thiếu")
              ? message
              : "Delete image failed",
        });
      }
      return;
    }

    methodNotAllowed(res, ["POST", "DELETE"]);
  });
}

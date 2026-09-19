import { apiFetch, ApiError } from "@/api/client";

export type SignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export type CloudinaryUploadResult = {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

type SignatureResponse =
  | { success: true; data: SignedUploadParams }
  | { success: false; message?: string; error?: string };

type DeleteResponse =
  | { success: true }
  | { success: false; message?: string; error?: string };

const UPLOAD_TIMEOUT_MS = 60_000;

export async function requestUploadSignature(
  folder?: string,
): Promise<SignedUploadParams> {
  const res = await apiFetch<SignatureResponse>("/api/upload", {
    method: "POST",
    body: { folder },
  });
  if (!res.success || !res.data) {
    throw new ApiError(
      (res as { message?: string }).message ?? "Không lấy được chữ ký upload",
      500,
    );
  }
  return res.data;
}

export async function deleteUploadedImage(publicId: string): Promise<void> {
  const res = await apiFetch<DeleteResponse>("/api/upload", {
    method: "DELETE",
    body: { publicId },
  });
  if (!res.success) {
    throw new ApiError(
      (res as { message?: string }).message ?? "Xóa ảnh thất bại",
      500,
    );
  }
}

export function uploadFileToCloudinary(
  file: File,
  signed: SignedUploadParams,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const endpoint = `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`;

    const timer = window.setTimeout(() => {
      xhr.abort();
      reject(new Error("Upload timeout — vui lòng thử lại"));
    }, UPLOAD_TIMEOUT_MS);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    });

    xhr.addEventListener("load", () => {
      window.clearTimeout(timer);
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        reject(new Error("Upload image failed"));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const msg =
          typeof json.error === "object" &&
          json.error &&
          "message" in json.error
            ? String((json.error as { message: string }).message)
            : "Upload image failed";
        reject(new Error(msg));
        return;
      }
      const secureUrl = String(json.secure_url ?? json.url ?? "");
      const publicId = String(json.public_id ?? "");
      if (!secureUrl || !publicId) {
        reject(new Error("Upload image failed"));
        return;
      }
      resolve({
        url: String(json.url ?? secureUrl),
        secureUrl,
        publicId,
        width: Number(json.width) || 0,
        height: Number(json.height) || 0,
        format: String(json.format ?? ""),
        bytes: Number(json.bytes) || file.size,
      });
    });

    xhr.addEventListener("error", () => {
      window.clearTimeout(timer);
      reject(new Error("Không kết nối được Cloudinary"));
    });

    xhr.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new Error("Upload đã hủy"));
    });

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("folder", signed.folder);

    xhr.open("POST", endpoint);
    xhr.send(form);
  });
}

import { v2 as cloudinary } from "cloudinary";

export const CLOUDINARY_FOLDERS = [
  "sitha-trip",
  "sitha-trip/rides",
  "sitha-trip/drivers",
  "sitha-trip/tours",
  "sitha-trip/blog",
  "sitha-trip/gallery",
  "sitha-trip/banners",
] as const;

export type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[number];

const FOLDER_SET = new Set<string>(CLOUDINARY_FOLDERS);

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type SignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: CloudinaryFolder;
};

let configured = false;

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME ?? "").trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY ?? "").trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET ?? "").trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_* is not configured");
  }
  return { cloudName, apiKey, apiSecret };
}

function ensureConfigured(): CloudinaryConfig {
  const config = getCloudinaryConfig();
  if (!configured) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
    configured = true;
  }
  return config;
}

/** Normalize + whitelist folder. Empty/missing → default `sitha-trip`. */
export function normalizeFolder(input?: string | null): CloudinaryFolder {
  const raw = (input ?? "").trim();
  const folder = (raw || "sitha-trip") as CloudinaryFolder;
  if (!FOLDER_SET.has(folder)) {
    throw new Error("Folder upload không hợp lệ");
  }
  return folder;
}

export function isAllowedPublicId(publicId: string): boolean {
  const id = publicId.trim();
  if (!id) return false;
  return CLOUDINARY_FOLDERS.some(
    (folder) => id === folder || id.startsWith(`${folder}/`),
  );
}

export function createUploadSignature(
  folderInput?: string | null,
): SignedUploadParams {
  const config = ensureConfigured();
  const folder = normalizeFolder(folderInput);
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(
    toSign,
    config.apiSecret,
  );
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    signature,
    folder,
  };
}

export async function destroyImage(publicId: string): Promise<void> {
  ensureConfigured();
  const id = publicId.trim();
  if (!isAllowedPublicId(id)) {
    throw new Error("publicId không hợp lệ");
  }
  const result = await cloudinary.uploader.destroy(id, {
    invalidate: true,
    resource_type: "image",
  });
  const status = (result as { result?: string }).result;
  if (status !== "ok" && status !== "not found") {
    throw new Error("Delete image failed");
  }
}
